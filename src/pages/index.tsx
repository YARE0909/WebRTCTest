import { useRouter } from 'next/router';
import React, { useState } from 'react'
import { setCookie } from 'nookies'

const Index = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const router = useRouter();

  const handleSubmit = async () => {
    if (username === 'host' && password === 'host') {
      setCookie(null, 'user', 'host', {
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      })
      router.push('/host')
    } else if (username === 'olive_indiranagar' && password === 'guest') {
      setCookie(null, 'user', 'olive_indiranagar', {
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      })
      router.push('/guest')
    } else if (username === 'olive_whitefield' && password === 'guest') {
      setCookie(null, 'user', 'olive_whitefield', {
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      })
      router.push('/guest')
    } else {
      console.log('Invalid username or password')
    }
  }

  return (
    <div className='w-full h-screen flex items-center justify-center bg-black text-white'>
      <div className='flex flex-col space-y-4 items-center border border-gray-600 rounded-md p-4'>
        <div className=''>
          <h1 className='font-bold text-3xl'>Login To Orion</h1>
        </div>
        <div>
          <input type='text' placeholder='Username' className='border border-gray-600 rounded-md p-2 bg-black outline-none' onChange={
            (e) => setUsername(e.target.value)
          } />
        </div>
        <div>
          <input type='password' placeholder='Password' className='border border-gray-600 rounded-md p-2 bg-black outline-none' onChange={
            (e) => setPassword(e.target.value)
          } />
        </div>
        <div>
          <button className='bg-blue-500 text-white p-2 rounded-md' onClick={handleSubmit}>Login</button>
        </div>
      </div>
    </div>
  )
}

export default Index