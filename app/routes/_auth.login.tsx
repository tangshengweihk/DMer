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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            设备管理系统
          </h1>
          <p className="mt-2 text-gray-400">请登录以继续</p>
        </div>
        
        <Form method="post" className="mt-8 space-y-6 bg-[#0f172a] p-6 rounded-lg shadow-xl">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="w-full px-4 py-2 bg-[#1e293b] border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入用户名"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-4 py-2 bg-[#1e293b] border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入密码"
              />
            </div>
          </div>

          {actionData?.error && (
            <div className="text-red-400 text-sm text-center bg-red-900/50 p-2 rounded">
              {actionData.error}
            </div>
          )}

          <div>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-[#0f172a] transition-colors"
            >
              登录
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
} 