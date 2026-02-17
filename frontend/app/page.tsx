import { createClient } from '@/lib/supabase/server'
import { getUserProjects } from '@/lib/actions/project-sharing'
import { ArrowRight, Shield, ShieldCheck, Plus, Briefcase } from 'lucide-react'
import Link from 'next/link'
import { LogoutButton } from '@/components/logout-button-client'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isAdmin = false
  if (user) {
    const { data } = await supabase.from('admin_profiles').select('*').eq('auth_user_id', user.id).single()
    isAdmin = !!data
  }

  const projects = user ? await getUserProjects() : []

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
      <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-8">Blukastor <span className="text-gray-400 font-light">OS</span></h1>

      {user ? (
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-8">
            <div className="p-8 text-center border-b border-gray-50">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mx-auto flex items-center justify-center mb-4 text-2xl font-bold text-gray-600">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <p className="text-gray-500 text-sm">Sesión iniciada como</p>
              <p className="font-bold text-gray-900 mt-1 text-lg">{user.email}</p>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/50">
              <a href="/admin/dashboard" className={`flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition ${isAdmin ? 'bg-black text-white hover:bg-gray-800' : 'bg-white text-gray-300 border border-gray-100 cursor-not-allowed'}`}>
                {isAdmin ? 'Panel de Admin' : 'No eres Admin'}
              </a>
              <LogoutButton />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Briefcase size={20} className="text-gray-400" />
                Mis Proyectos
              </h2>
              {/* Future: Create Project Button */}
            </div>

            {projects.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {projects.map((project: any) => (
                  <Link
                    key={project.id}
                    href={`/${project.id}`} // Assuming accessing by ID works
                    className="group bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Briefcase size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{project.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {project.role === 'owner' ? (
                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                              <ShieldCheck size={10} /> Owner
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              <Shield size={10} /> {project.role}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400">
                            {new Date(project.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={20} className="text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-sm text-center">
                <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full mx-auto flex items-center justify-center mb-4">
                  <Briefcase size={24} />
                </div>
                <h3 className="font-bold text-gray-900">No tienes proyectos asignados</h3>
                <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">
                  Solicita una invitación a un administrador para acceder a un proyecto.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-8 flex gap-4">
          <a href="/login" className="bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition">
            Iniciar Sesión
          </a>
        </div>
      )}

      <div className="mt-12 text-[10px] text-gray-300 font-mono">
        v2.5.0-native-orchestration
      </div>
    </div>
  )
}
