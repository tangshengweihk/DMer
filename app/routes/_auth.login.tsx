import { Form, useActionData, useSearchParams } from '@remix-run/react';
import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { verifyUser } from '~/utils/db.server';
import { createUserSession, getUserSession } from '~/utils/session.server';

interface ActionData {
  error?: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getUserSession(request);
  if (session.has("userId")) {
    return redirect("/dashboard");
  }
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;
  const redirectTo = formData.get('redirectTo') as string || '/dashboard';

  if (!username || !password) {
    return json<ActionData>({ error: '用户名和密码不能为空' });
  }

  const user = await verifyUser(username, password);
  
  if (!user) {
    return json<ActionData>({ error: '用户名或密码错误' });
  }

  return createUserSession(user.id, user.user_type, redirectTo);
}

export default function Login() {
  const actionData = useActionData<ActionData>();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#020817] text-white">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold" style={{
            background: 'linear-gradient(90deg, rgb(0, 145, 255) 0%, rgb(0, 255, 119) 20%, rgb(255, 226, 0) 40%, rgb(255, 0, 179) 60%, rgb(255, 0, 255) 80%, rgb(0, 145, 255) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundSize: '200% auto',
            animation: 'shine 4s linear infinite',
            textShadow: '0 0 30px rgba(255, 255, 255, 0.1)'
          }}>
            设备管理系统
          </h1>
        </div>
        
        <Form 
          method="post" 
          className="mt-12 space-y-8 bg-[#0f172a] p-8 rounded-2xl shadow-2xl border border-gray-800"
          style={{
            boxShadow: '0 0 40px rgba(255, 255, 255, 0.03)'
          }}
        >
          <input type="hidden" name="redirectTo" value={redirectTo} />
          
          <div className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                用户名
              </label>
              <div className="relative">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-[#1e293b] border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0091ff] focus:border-transparent transition-all"
                  placeholder="请输入用户名"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                密码
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full px-4 py-3 bg-[#1e293b] border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0091ff] focus:border-transparent transition-all"
                  placeholder="请输入密码"
                />
              </div>
            </div>
          </div>

          {actionData?.error && (
            <div className="text-red-400 text-sm text-center bg-red-900/50 p-3 rounded-lg border border-red-800">
              {actionData.error}
            </div>
          )}

          <div>
            <button
              type="submit"
              className="relative w-full py-3 px-4 rounded-lg font-medium text-white overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0091ff] focus:ring-offset-[#0f172a]"
              style={{
                background: 'linear-gradient(90deg, rgb(0, 145, 255) 0%, rgb(0, 255, 119) 20%, rgb(255, 226, 0) 40%, rgb(255, 0, 179) 60%, rgb(255, 0, 255) 80%, rgb(0, 145, 255) 100%)',
                backgroundSize: '200% auto',
                animation: 'shine 4s linear infinite'
              }}
            >
              登录
            </button>
          </div>
        </Form>
      </div>

      <style>{`
        @keyframes shine {
          to {
            background-position: 200% center;
          }
        }
      `}</style>
    </div>
  );
} 