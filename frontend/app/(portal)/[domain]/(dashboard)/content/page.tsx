import { createClient } from '@/lib/supabase/server'
import { Calendar, Layout, Image as ImageIcon, Send, Clock, Edit3, MoreHorizontal, Instagram, Twitter, Linkedin, Facebook, Plus, Search, Filter } from 'lucide-react'

export default async function ContentManagerPage() {
    const supabase = await createClient()

    // Fetch social content
    const { data: content, error } = await supabase
        .from('social_content')
        .select('*')
        .order('schedule_date', { ascending: true })

    if (error) {
        return <div className="p-8 text-red-500">Error loading content: {error.message}</div>
    }

    const platformIcons: Record<string, any> = {
        instagram: Instagram,
        twitter: Twitter,
        linkedin: Linkedin,
        facebook: Facebook,
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Content Manager</h1>
                    <p className="text-gray-500 mt-1">Planifica, programa y gestiona tus campañas de redes sociales.</p>
                </div>
                <button className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition shadow-lg shadow-black/5 text-sm">
                    <Plus size={18} />
                    <span>Crear Post</span>
                </button>
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button className="bg-black text-white px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap">Todos</button>
                <button className="bg-white text-gray-500 px-4 py-2 rounded-full text-xs font-bold border border-gray-100 whitespace-nowrap hover:bg-gray-50 transition">Programados</button>
                <button className="bg-white text-gray-500 px-4 py-2 rounded-full text-xs font-bold border border-gray-100 whitespace-nowrap hover:bg-gray-50 transition">Borradores</button>
                <button className="bg-white text-gray-500 px-4 py-2 rounded-full text-xs font-bold border border-gray-100 whitespace-nowrap hover:bg-gray-50 transition">Publicados</button>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {content?.map((post) => (
                    <div key={post.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
                        <div className="relative aspect-square bg-gray-50 overflow-hidden">
                            {post.media_urls?.[0] ? (
                                <img src={post.media_urls[0]} alt="Content preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                                    <ImageIcon size={48} strokeWidth={1} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sin Media</span>
                                </div>
                            )}

                            {/* Platform Tag */}
                            <div className="absolute top-4 left-4">
                                <div className="bg-white/90 backdrop-blur-md p-2 rounded-xl shadow-sm">
                                    {(() => {
                                        const Icon = platformIcons[post.platform?.toLowerCase()] || Layout;
                                        return <Icon size={16} className="text-gray-900" />
                                    })()}
                                </div>
                            </div>

                            {/* Status Tag */}
                            <div className="absolute top-4 right-4">
                                <span className={cn(
                                    "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border",
                                    post.status === 'posted' ? "bg-green-50/90 text-green-700 border-green-100" :
                                        post.status === 'scheduled' ? "bg-blue-50/90 text-blue-700 border-blue-100" :
                                            "bg-gray-50/90 text-gray-500 border-gray-100"
                                )}>
                                    {post.status}
                                </span>
                            </div>
                        </div>

                        <div className="p-6 flex-1 flex flex-col">
                            <h3 className="text-sm font-bold text-gray-900 mb-2 line-clamp-2">{post.content_text || 'Sin texto'}</h3>

                            <div className="mt-auto space-y-4 pt-4">
                                <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    <div className="flex items-center gap-1.5">
                                        <Clock size={12} />
                                        <span>{post.schedule_date ? new Date(post.schedule_date).toLocaleDateString() : 'Sin fecha'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Edit3 size={12} />
                                        <span>Nova AI</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button className="flex-1 bg-gray-50 text-black py-2 rounded-xl text-xs font-bold hover:bg-gray-100 transition border border-gray-100">
                                        Editar
                                    </button>
                                    <button className="bg-gray-50 border border-gray-100 text-gray-400 hover:text-black p-2 rounded-xl transition">
                                        <MoreHorizontal size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Create Call to Action Card */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm border-dashed p-8 flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-gray-50/50 transition-colors">
                    <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Plus size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Nueva Pieza</h3>
                    <p className="text-sm text-gray-500 mt-1 max-w-[200px]">Crea contenido desde cero o deja que Nova lo haga por ti.</p>
                </div>
            </div>

            {/* Content Pillar Strategy (Visual context) */}
            <div className="bg-gray-900 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-2">
                    <h2 className="text-2xl font-black">Estrategia de Pilares</h2>
                    <p className="text-gray-400 text-sm max-w-sm">Tu contenido está distribuido un 60% en Educación, 20% en Ventas y 20% en Comunidad.</p>
                </div>
                <div className="flex gap-4">
                    <div className="text-center">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-2 mx-auto">
                            <Calendar size={20} className="text-white" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Programador</span>
                    </div>
                    <div className="text-center">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-2 mx-auto">
                            <Layout size={20} className="text-white" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Editor</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

function cn(...inputs: any[]) { return inputs.filter(Boolean).join(' ') }
