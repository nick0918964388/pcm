import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user-repository';
import { RoleRepository } from '../repositories/role-repository';
import { User } from '../types/database';

export interface LoginCredentials {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isVerified: boolean;
  roles: string[];
  permissions: string[];
}

export class AuthService {
  private userRepository: UserRepository;
  private roleRepository: RoleRepository;
  private jwtSecret: string;
  private refreshSecret: string;
  private tokenExpiry: string;
  private refreshExpiry: string;

  constructor() {
    this.userRepository = new UserRepository();
    this.roleRepository = new RoleRepository();
    this.jwtSecret = process.env.JWT_SECRET || 'your-jwt-secret';
    this.refreshSecret =
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
    this.tokenExpiry = process.env.JWT_EXPIRY || '15m';
    this.refreshExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
  }

  // 用戶登入
  async login(credentials: LoginCredentials): Promise<{
    user: AuthUser;
    tokens: AuthTokens;
  }> {
    const { usernameOrEmail, password } = credentials;

    // 查找用戶
    const user =
      await this.userRepository.findByUsernameOrEmail(usernameOrEmail);
    if (!user) {
      throw new Error('用戶不存在或密碼錯誤');
    }

    // 檢查帳號是否被鎖定
    if (await this.userRepository.isUserLocked(user.id)) {
      throw new Error('帳號已被鎖定，請稍後再試');
    }

    // 驗證密碼
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      // 增加失敗次數
      await this.userRepository.incrementFailedLoginAttempts(user.id);

      // 檢查是否需要鎖定帳號
      if (user.failed_login_attempts + 1 >= 5) {
        await this.userRepository.lockUser(user.id, 30); // 鎖定 30 分鐘
        throw new Error('密碼錯誤次數過多，帳號已被鎖定 30 分鐘');
      }

      throw new Error('用戶不存在或密碼錯誤');
    }

    // 更新最後登入時間並重置失敗次數
    await this.userRepository.updateLastLogin(user.id);

    // 獲取用戶角色和權限
    const roles = await this.roleRepository.findUserRoles(user.id);
    const permissions = await this.roleRepository.getUserPermissions(user.id);

    // 生成 JWT Token
    const tokens = await this.generateTokens(user);

    // 構建回傳的用戶資訊
    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      isVerified: user.is_verified,
      roles: roles.map(role => role.name),
      permissions,
    };

    return {
      user: authUser,
      tokens,
    };
  }

  // 用戶註冊
  async register(registerData: RegisterData): Promise<User> {
    const { username, email, password, firstName, lastName } = registerData;

    // 檢查用戶名是否已存在
    if (await this.userRepository.isUsernameExists(username)) {
      throw new Error('用戶名已存在');
    }

    // 檢查信箱是否已存在
    if (await this.userRepository.isEmailExists(email)) {
      throw new Error('信箱已存在');
    }

    // 驗證密碼強度
    this.validatePassword(password);

    // 加密密碼
    const passwordHash = await bcrypt.hash(password, 12);

    // 創建用戶
    const user = await this.userRepository.create({
      username,
      email,
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
      is_verified: false,
      failed_login_attempts: 0,
    });

    // 分配預設角色 (一般用戶)
    const defaultRole = await this.roleRepository.findByName('user');
    if (defaultRole) {
      await this.roleRepository.assignRoleToUser(
        user.id,
        defaultRole.id,
        'system'
      );
    }

    return user;
  }

  // 刷新 Token
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // 驗證 refresh token
      const payload = jwt.verify(refreshToken, this.refreshSecret) as any;

      // 查找用戶
      const user = await this.userRepository.findById(payload.userId);
      if (!user || !user.is_active) {
        throw new Error('用戶不存在或已被停用');
      }

      // 生成新的 tokens
      return this.generateTokens(user);
    } catch (error) {
      throw new Error('無效的 refresh token');
    }
  }

  // 驗證 Token
  async verifyToken(token: string): Promise<AuthUser> {
    try {
      // 驗證 JWT
      const payload = jwt.verify(token, this.jwtSecret) as any;

      // 查找用戶
      const user = await this.userRepository.findById(payload.userId);
      if (!user || !user.is_active) {
        throw new Error('用戶不存在或已被停用');
      }

      // 獲取用戶角色和權限
      const roles = await this.roleRepository.findUserRoles(user.id);
      const permissions = await this.roleRepository.getUserPermissions(user.id);

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isVerified: user.is_verified,
        roles: roles.map(role => role.name),
        permissions,
      };
    } catch (error) {
      throw new Error('無效的 access token');
    }
  }

  // 修改密碼
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    // 查找用戶
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('用戶不存在');
    }

    // 驗證舊密碼
    const isOldPasswordValid = await bcrypt.compare(
      oldPassword,
      user.password_hash
    );
    if (!isOldPasswordValid) {
      throw new Error('舊密碼錯誤');
    }

    // 驗證新密碼強度
    this.validatePassword(newPassword);

    // 檢查新密碼與舊密碼不能相同
    const isSamePassword = await bcrypt.compare(
      newPassword,
      user.password_hash
    );
    if (isSamePassword) {
      throw new Error('新密碼不能與舊密碼相同');
    }

    // 加密新密碼並更新
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await this.userRepository.update(userId, {
      password_hash: newPasswordHash,
    });
  }

  // 重設密碼 (忘記密碼)
  async resetPassword(
    email: string,
    newPassword: string,
    resetToken: string
  ): Promise<void> {
    // 這裡應該驗證重設密碼的 token
    // 實際應用中需要實作 token 生成和驗證機制

    // 查找用戶
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('用戶不存在');
    }

    // 驗證新密碼強度
    this.validatePassword(newPassword);

    // 加密新密碼並更新
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userRepository.update(user.id, {
      password_hash: passwordHash,
      failed_login_attempts: 0, // 重設失敗次數
      locked_until: undefined, // 解鎖帳號
    });
  }

  // 驗證用戶帳號
  async verifyUser(userId: string): Promise<void> {
    await this.userRepository.verifyUser(userId);
  }

  // 檢查權限
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    return this.roleRepository.hasPermission(userId, permission);
  }

  // 檢查角色
  async hasRole(userId: string, roleName: string): Promise<boolean> {
    return this.roleRepository.hasRole(userId, roleName);
  }

  // 獲取用戶詳細信息
  async getUserProfile(userId: string): Promise<AuthUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('用戶不存在');
    }

    const roles = await this.roleRepository.findUserRoles(user.id);
    const permissions = await this.roleRepository.getUserPermissions(user.id);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      isVerified: user.is_verified,
      roles: roles.map(role => role.name),
      permissions,
    };
  }

  // 生成 JWT Tokens
  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload = {
      userId: user.id,
      username: user.username,
      email: user.email,
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.tokenExpiry,
      issuer: 'pcm-system',
      audience: 'pcm-users',
    });

    const refreshToken = jwt.sign({ userId: user.id }, this.refreshSecret, {
      expiresIn: this.refreshExpiry,
      issuer: 'pcm-system',
      audience: 'pcm-users',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiryToSeconds(this.tokenExpiry),
      tokenType: 'Bearer',
    };
  }

  // 驗證密碼強度
  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new Error('密碼長度至少需要 8 個字符');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      throw new Error('密碼必須包含至少一個小寫字母');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      throw new Error('密碼必須包含至少一個大寫字母');
    }

    if (!/(?=.*\d)/.test(password)) {
      throw new Error('密碼必須包含至少一個數字');
    }

    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?])/.test(password)) {
      throw new Error('密碼必須包含至少一個特殊字符');
    }
  }

  // 解析過期時間為秒數
  private parseExpiryToSeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900; // 預設 15 分鐘
    }
  }

  // 登出 (可以實作 token 黑名單機制)
  async logout(token: string): Promise<void> {
    // 實際應用中可以將 token 加入黑名單
    // 這裡只是示例，實際實作需要 Redis 或資料庫來存儲黑名單
    console.log(`Token ${token} has been logged out`);
  }

  // 批量鎖定用戶
  async lockUsers(userIds: string[], lockDurationMinutes = 30): Promise<void> {
    await Promise.all(
      userIds.map(userId =>
        this.userRepository.lockUser(userId, lockDurationMinutes)
      )
    );
  }

  // 批量解鎖用戶
  async unlockUsers(userIds: string[]): Promise<void> {
    await Promise.all(
      userIds.map(userId =>
        this.userRepository.resetFailedLoginAttempts(userId)
      )
    );
  }
}
