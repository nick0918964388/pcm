import { 
  User, 
  AuthCredentials, 
  AuthToken, 
  AuthResult,
  SessionConfig 
} from '@/types/auth'

const TOKEN_KEY = 'pcm_access_token'
const REFRESH_TOKEN_KEY = 'pcm_refresh_token'
const USER_KEY = 'pcm_user'
const LAST_ACTIVITY_KEY = 'pcm_last_activity'

class AuthService {
  private sessionTimer: NodeJS.Timeout | null = null
  private warningTimer: NodeJS.Timeout | null = null
  private sessionConfig: SessionConfig = {
    timeoutDuration: 30, // 30 minutes
    warningDuration: 5, // 5 minutes warning
    checkInterval: 60 // check every 60 seconds
  }

  /**
   * 使用者登入
   */
  async login(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      // 模擬 API 呼叫 - 實際環境需要替換為真實 API
      // TODO: 替換為真實的 API endpoint
      const response = await this.mockApiLogin(credentials)
      
      if (response.success && response.token && response.user) {
        // 儲存 token 和使用者資訊
        this.saveToken(response.token)
        this.saveUser(response.user)
        this.updateLastActivity()
        
        // 啟動 session 監控
        this.startSessionMonitoring()
        
        return {
          success: true,
          user: response.user,
          token: response.token,
          message: '登入成功'
        }
      }
      
      return {
        success: false,
        error: response.error || '登入失敗',
        message: response.message
      }
    } catch (error) {
      console.error('Login error:', error)
      return {
        success: false,
        error: '登入時發生錯誤',
        message: error instanceof Error ? error.message : '未知錯誤'
      }
    }
  }

  /**
   * 使用者登出
   */
  logout(): void {
    // 清除所有儲存的資料
    this.clearToken()
    this.clearUser()
    this.clearLastActivity()
    
    // 停止 session 監控
    this.stopSessionMonitoring()
    
    // 清除其他相關儲存
    sessionStorage.clear()
    
    // 導向到登入頁面
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }

  /**
   * 檢查是否已認證
   */
  isAuthenticated(): boolean {
    const token = this.getToken()
    const user = this.getCurrentUser()
    return !!(token && user)
  }

  /**
   * 取得當前使用者
   */
  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null
    
    const userStr = localStorage.getItem(USER_KEY)
    if (!userStr) return null
    
    try {
      return JSON.parse(userStr) as User
    } catch {
      return null
    }
  }

  /**
   * 取得 Token
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(TOKEN_KEY)
  }

  /**
   * 刷新 Token
   */
  async refreshToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) return false
    
    try {
      // TODO: 實作真實的 token 刷新 API
      const response = await this.mockApiRefreshToken(refreshToken)
      
      if (response.success && response.token) {
        this.saveToken(response.token)
        this.updateLastActivity()
        return true
      }
      
      return false
    } catch (error) {
      console.error('Token refresh error:', error)
      return false
    }
  }

  /**
   * 設定 Session Timeout
   */
  setupSessionTimeout(duration: number): void {
    this.sessionConfig.timeoutDuration = duration
    this.restartSessionMonitoring()
  }

  /**
   * 更新最後活動時間
   */
  updateLastActivity(): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(LAST_ACTIVITY_KEY, new Date().toISOString())
  }

  /**
   * 檢查 Session 是否過期
   */
  isSessionExpired(): boolean {
    const lastActivity = this.getLastActivity()
    if (!lastActivity) return true
    
    const now = new Date()
    const diffMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60)
    
    return diffMinutes > this.sessionConfig.timeoutDuration
  }

  /**
   * 取得剩餘 Session 時間（分鐘）
   */
  getSessionRemainingTime(): number {
    const lastActivity = this.getLastActivity()
    if (!lastActivity) return 0
    
    const now = new Date()
    const diffMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60)
    const remaining = this.sessionConfig.timeoutDuration - diffMinutes
    
    return Math.max(0, Math.floor(remaining))
  }

  // Private methods

  private saveToken(token: AuthToken): void {
    if (typeof window === 'undefined') return
    
    localStorage.setItem(TOKEN_KEY, token.accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, token.refreshToken)
    
    // 也將 token 存儲到 cookies 中供 middleware 使用
    const expiresIn = token.expiresIn * 1000 // 轉換為毫秒
    const expires = new Date(Date.now() + expiresIn)
    
    document.cookie = `pcm_access_token=${token.accessToken}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`
  }

  private saveUser(user: User): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }

  private clearToken(): void {
    if (typeof window === 'undefined') return
    
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    
    // 也清除 cookies 中的 token
    document.cookie = 'pcm_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
  }

  private clearUser(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(USER_KEY)
  }

  private clearLastActivity(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(LAST_ACTIVITY_KEY)
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  }

  private getLastActivity(): Date | null {
    if (typeof window === 'undefined') return null
    
    const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY)
    if (!lastActivityStr) return null
    
    try {
      return new Date(lastActivityStr)
    } catch {
      return null
    }
  }

  /**
   * 啟動 Session 監控
   */
  private startSessionMonitoring(): void {
    this.stopSessionMonitoring()
    
    // 檢查 session 過期
    this.sessionTimer = setInterval(() => {
      if (this.isSessionExpired()) {
        this.handleSessionTimeout()
      } else {
        const remaining = this.getSessionRemainingTime()
        
        // 顯示警告
        if (remaining <= this.sessionConfig.warningDuration && remaining > 0) {
          this.showSessionWarning(remaining)
        }
      }
    }, this.sessionConfig.checkInterval * 1000)
    
    // 監聽使用者活動
    if (typeof window !== 'undefined') {
      const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart']
      activityEvents.forEach(event => {
        window.addEventListener(event, this.handleUserActivity)
      })
    }
  }

  /**
   * 停止 Session 監控
   */
  private stopSessionMonitoring(): void {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer)
      this.sessionTimer = null
    }
    
    if (this.warningTimer) {
      clearTimeout(this.warningTimer)
      this.warningTimer = null
    }
    
    // 移除事件監聽
    if (typeof window !== 'undefined') {
      const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart']
      activityEvents.forEach(event => {
        window.removeEventListener(event, this.handleUserActivity)
      })
    }
  }

  /**
   * 重新啟動 Session 監控
   */
  private restartSessionMonitoring(): void {
    if (this.isAuthenticated()) {
      this.startSessionMonitoring()
    }
  }

  /**
   * 處理使用者活動
   */
  private handleUserActivity = (): void => {
    if (this.isAuthenticated()) {
      this.updateLastActivity()
    }
  }

  /**
   * 處理 Session Timeout
   */
  private handleSessionTimeout(): void {
    // 發送事件通知
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sessionTimeout'))
    }
    
    // 自動登出
    this.logout()
  }

  /**
   * 顯示 Session 警告
   */
  private showSessionWarning(remainingMinutes: number): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sessionWarning', {
        detail: { remainingMinutes }
      }))
    }
  }

  // Mock API methods - 實際環境需要替換

  private async mockApiLogin(credentials: AuthCredentials): Promise<AuthResult> {
    // 模擬 API 延遲
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 模擬驗證
    if (credentials.username === 'admin' && credentials.password === 'password') {
      return {
        success: true,
        user: {
          id: '1',
          username: 'admin',
          email: 'admin@pcm.com',
          name: '系統管理員',
          role: 'admin',
          permissions: ['*'],
          lastLogin: new Date()
        },
        token: {
          accessToken: 'mock-jwt-token-' + Date.now(),
          refreshToken: 'mock-refresh-token-' + Date.now(),
          expiresIn: 3600,
          tokenType: 'Bearer'
        }
      }
    }
    
    return {
      success: false,
      error: '使用者名稱或密碼錯誤',
      message: '請檢查您的登入資訊'
    }
  }

  private async mockApiRefreshToken(refreshToken: string): Promise<AuthResult> {
    // 模擬 API 延遲
    await new Promise(resolve => setTimeout(resolve, 500))
    
    return {
      success: true,
      token: {
        accessToken: 'mock-jwt-token-refreshed-' + Date.now(),
        refreshToken: refreshToken,
        expiresIn: 3600,
        tokenType: 'Bearer'
      }
    }
  }
}

// 建立單例實例
const authService = new AuthService()

export default authService