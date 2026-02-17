'use client'

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useRouter, useSearchParams } from 'next/navigation'

export function ProjectFilter({ projects }: { projects: { id: string, name: string }[] }) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Get current value from URL or default to 'all'
    // We check both 'projectId' and just ensuring if it's not present we show 'all'
    const currentProject = searchParams.get('projectId') || 'all'

    const handleValueChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value === 'all') {
            params.delete('projectId')
        } else {
            params.set('projectId', value)
        }
        router.push(`?${params.toString()}`)
    }

    return (
        <Select value={currentProject} onValueChange={handleValueChange}>
            <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by Project" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                        {p.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
