import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Signup from './pages/Signup'
import Login from './pages/Login'
import OAuthCallback from './pages/OAuthCallback'
import Profile from './pages/Profile'
import PostList from './pages/PostList'
import PostCreate from './pages/PostCreate'
import PostDetail from './pages/PostDetail'
import About from './pages/About'
import DirectMessage from './pages/DirectMessage'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminUserDetail from './pages/admin/AdminUserDetail'
import AdminPosts from './pages/admin/AdminPosts'
import AdminPostDetail from './pages/admin/AdminPostDetail'
import AdminComments from './pages/admin/AdminComments'
import { AuthProvider } from './contexts/AuthProvider'
import AdminRoute from './components/AdminRoute'

function App() {

  return (
    <>
      {/* AuthProvider로 전체 애플리케이션을 감싸서 어디서든 인증 정보에 접근할 수 있도록 함 */}
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path='/' element={<Home />}/>
            <Route path='/login' element={<Login />}/>
            <Route path='/signup' element={<Signup />}/>
            {/* 소셜 로그인(카카오) 콜백 라우트 */}
            <Route path='/oauth/callback' element={<OAuthCallback />}/>
            {/* 프로필 수정 페이지 */}
            <Route path='/profile' element={<Profile />}/>
            {/* 게시글 관련 페이지 */}
            <Route path='/posts' element={<PostList />}/>
            <Route path='/posts/create' element={<PostCreate />}/>
            <Route path='/posts/:id' element={<PostDetail />}/>
            {/* 프로젝트 소개 페이지 */}
            <Route path='/about' element={<About />}/>
            {/* 다이렉트 메시지 페이지 */}
            <Route path='/dm' element={<DirectMessage />}/>
            {/* 관리자 페이지 */}
            <Route
              path='/admin'
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route index element={<Navigate to='/admin/dashboard' replace />} />
              <Route path='dashboard' element={<AdminDashboard />} />
              <Route path='users' element={<AdminUsers />} />
              <Route path='users/:id' element={<AdminUserDetail />} />
              <Route path='posts' element={<AdminPosts />} />
              <Route path='posts/:id' element={<AdminPostDetail />} />
              <Route path='comments' element={<AdminComments />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </>
  )
}

export default App
