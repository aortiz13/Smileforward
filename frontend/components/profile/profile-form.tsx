'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { User, Mail, MapPin, Briefcase, Info, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProfileData {
    real_name?: string
    nickname?: string
    email?: string
    country?: string
    city?: string
    job_title?: string
    industry?: string
    bio?: string
}

export function ProfileForm({ contactId, companyId }: { contactId: string, companyId: string }) {
    const [profile, setProfile] = useState<ProfileData>({})
    const [isLoading, setIsLoading] = useState(true)
    const [isUpdating, setIsUpdating] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        const fetchProfile = async () => {
            const { data, error } = await supabase
                .from('user_context')
                .select('profile')
                .eq('contact_id', contactId)
                .single()

            if (data?.profile) {
                setProfile(data.profile as ProfileData)
            }
            setIsLoading(false)
        }

        fetchProfile()

        // Subscribe to real-time updates for user_context
        const channel = supabase
            .channel(`profile_sync_${contactId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'user_context',
                    filter: `contact_id=eq.${contactId}`
                },
                (payload) => {
                    console.log('Profile Sync: Received update', payload.new)
                    if (payload.new && (payload.new as any).profile) {
                        setProfile((payload.new as any).profile as ProfileData)
                        setIsUpdating(true)
                        setTimeout(() => setIsUpdating(false), 2000)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [contactId])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        )
    }

    const Field = ({ label, icon: Icon, value, placeholder }: { label: string, icon: any, value?: string, placeholder: string }) => (
        <div className="space-y-1.5 transition-all duration-500">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                {label}
            </label>
            <div className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-gray-100 transition-all shadow-sm",
                isUpdating && value ? "border-primary ring-2 ring-primary/10 scale-[1.01]" : ""
            )}>
                <Icon size={18} className="text-gray-400 shrink-0" />
                <div className="flex-1">
                    {value ? (
                        <span className="text-gray-900 font-medium">{value}</span>
                    ) : (
                        <span className="text-gray-300 italic text-sm">{placeholder}</span>
                    )}
                </div>
                {isUpdating && value && (
                    <Sparkles size={14} className="text-primary animate-pulse" />
                )}
            </div>
        </div>
    )

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            <div className="col-span-full mb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Tu Perfil</h2>
                        <p className="text-gray-500 text-sm">Este perfil es gestionado automáticamente por </p>
                    </div>
                </div>
            </div>

            <Field
                label="Nombre Real"
                icon={User}
                value={profile.real_name}
                placeholder="Nova aún no conoce tu nombre completo..."
            />

            <Field
                label="Nickname / Apodo"
                icon={User}
                value={profile.nickname}
                placeholder="¿Cómo prefieres que te llamen?"
            />

            <Field
                label="Email"
                icon={Mail}
                value={profile.email}
                placeholder="ejemplo@dominio.com"
            />

            <Field
                label="Ubicación"
                icon={MapPin}
                value={profile.country && profile.city ? `${profile.city}, ${profile.country}` : profile.country || profile.city}
                placeholder="Ciudad, País"
            />

            <Field
                label="Puesto / Rol"
                icon={Briefcase}
                value={profile.job_title}
                placeholder="Ej: Emprendedor, CFO..."
            />

            <Field
                label="Industria"
                icon={Sparkles}
                value={profile.industry}
                placeholder="Ej: Inmobiliaria, Tech..."
            />

            <div className="md:col-span-2">
                <Field
                    label="Bio Corta"
                    icon={Info}
                    value={profile.bio}
                    placeholder="Lo que Nova ha aprendido sobre tus pasiones..."
                />
            </div>

            <div className="md:col-span-2 mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/10 flex gap-4 items-start">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Sparkles className="text-primary" size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-primary text-sm">Autocompletado Inteligente</h4>
                    <p className="text-gray-600 text-xs mt-1 leading-relaxed">
                        No necesitas llenar este formulario manualmente. Solo sigue hablando con Nova en el chat y ella irá completando tu perfil automáticamente usando inteligencia artificial.
                    </p>
                </div>
            </div>
        </div>
    )
}
