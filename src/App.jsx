import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Signup from './pages/Signup'
import Login from './pages/Login'
import { AuthProvider } from './contexts/AuthProvider'

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
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </>
  )
}

export default App
