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
    } else if (password === 'guest') {
      setCookie(null, 'user', username, {
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
      <div className='w-96 flex flex-col space-y-4 items-center border border-gray-600 rounded-md p-4'>
        <div className='w-full'>
          <h1 className='font-bold text-3xl'>Login To Orion</h1>
        </div>
        <div className='w-full'>
          <input type='text' placeholder='Username' className='w-full border border-gray-600 rounded-md p-2 bg-black outline-none' onChange={
            (e) => setUsername(e.target.value)
          } />
        </div>
        <div className='w-full'>
          <input type='password' placeholder='Password' className='w-full border border-gray-600 rounded-md p-2 bg-black outline-none' onChange={
            (e) => setPassword(e.target.value)
          } />
        </div>
        <div className='w-full'>
          <button className='w-full bg-blue-500 text-white px-4 py-2 font-bold rounded-md' onClick={handleSubmit}>Login</button>
        </div>
      </div>
    </div>
  )
}

export default Index