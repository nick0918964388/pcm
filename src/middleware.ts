import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 定義公開路由（不需要認證）
const publicRoutes = ['/login', '/']

// 定義需要認證的路由前綴
const protectedRoutePrefixes = ['/dashboard', '/project-selection']

// 檢查路由是否需要保護
function isProtectedRoute(pathname: string): boolean {
  return protectedRoutePrefixes.some(prefix => pathname.startsWith(prefix))
}

// 檢查用戶是否已認證
function isAuthenticated(request: NextRequest): boolean {
  // 檢查 cookies 中的 token
  const token = request.cookies.get('pcm_access_token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')
  
  return !!token
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 檢查是否為公開路由
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }
  
  // 檢查是否為受保護的路由
  if (isProtectedRoute(pathname)) {
    // 檢查用戶是否已認證
    if (!isAuthenticated(request)) {
      // 未認證，重導向到登入頁
      const loginUrl = new URL('/login', request.url)
      // 將原始 URL 作為 return URL 參數
      loginUrl.searchParams.set('returnUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    // 已認證，繼續處理請求
    return NextResponse.next()
  }
  
  // 對於其他路由，直接通過
  return NextResponse.next()
}

// 配置 middleware 匹配的路徑
export const config = {
  matcher: [
    /*
     * 匹配所有路徑，除了:
     * - api (API routes)
     * - _next/static (靜態文件)
     * - _next/image (圖片優化文件)
     * - favicon.ico (favicon 文件)
     * - 公開資產文件
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}