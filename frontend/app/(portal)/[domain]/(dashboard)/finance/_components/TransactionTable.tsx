'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Calendar as CalendarIcon, FileImage, Trash2, ArrowUpDown, FilterX, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ReceiptPreview } from './ReceiptPreview'
import { formatCurrency } from '@/lib/utils/currency'
import { deleteTransaction } from '@/lib/actions/finance'
import { toast } from 'sonner'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface TransactionTableProps {
    transactions: any[]
    companyCurrency: string
    categories: string[]
}

export function TransactionTable({ transactions, companyCurrency, categories }: TransactionTableProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Receipt Preview State
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    // Delete State
    const [isDeleting, setIsDeleting] = useState<string | null>(null)

    // Filter States (synced with URL)
    const handleFilterChange = (key: string, value: string | null) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value && value !== 'all') {
            params.set(key, value)
        } else {
            params.delete(key)
        }
        router.push(`?${params.toString()}`)
    }

    const handleSort = (column: string) => {
        const currentSort = searchParams.get('sort')
        const currentOrder = searchParams.get('order')

        const params = new URLSearchParams(searchParams.toString())

        if (currentSort === column) {
            // Toggle order
            params.set('order', currentOrder === 'asc' ? 'desc' : 'asc')
        } else {
            // New sort column, default to desc for date, asc for others
            params.set('sort', column)
            params.set('order', column === 'date' ? 'desc' : 'asc')
        }
        router.push(`?${params.toString()}`)
    }

    const handleDelete = async (id: string) => {
        setIsDeleting(id)
        const result = await deleteTransaction(id)
        setIsDeleting(null)

        if (result?.error) {
            toast.error(result.error)
        } else {
            toast.success('Transaction deleted')
        }
    }

    const clearFilters = () => {
        const params = new URLSearchParams(searchParams.toString())
        params.delete('startDate')
        params.delete('endDate')
        params.delete('type')
        params.delete('category')
        router.push(`?${params.toString()}`)
    }

    // Helper to get current sort icon
    const getSortIcon = (column: string) => {
        if (searchParams.get('sort') !== column) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
        return searchParams.get('order') === 'asc'
            ? <ArrowUpDown className="ml-2 h-4 w-4 text-primary rotate-180" />
            : <ArrowUpDown className="ml-2 h-4 w-4 text-primary" />
    }

    return (
        <div className="space-y-4">
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center justify-between bg-white p-4 rounded-lg border">
                <div className="flex flex-wrap gap-4 items-center w-full">

                    {/* Date Filter */}
                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[240px] justify-start text-left font-normal",
                                        !searchParams.get('startDate') && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {searchParams.get('startDate') ? (
                                        searchParams.get('endDate') ? (
                                            <>
                                                {format(new Date(searchParams.get('startDate')!), "LLL dd, y")} -{" "}
                                                {format(new Date(searchParams.get('endDate')!), "LLL dd, y")}
                                            </>
                                        ) : (
                                            format(new Date(searchParams.get('startDate')!), "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Pick a date range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : new Date()}
                                    selected={{
                                        from: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
                                        to: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
                                    }}
                                    onSelect={(range) => {
                                        if (range?.from) {
                                            const params = new URLSearchParams(searchParams.toString())
                                            params.set('startDate', format(range.from, 'yyyy-MM-dd'))
                                            if (range.to) {
                                                params.set('endDate', format(range.to, 'yyyy-MM-dd'))
                                            } else {
                                                params.delete('endDate')
                                            }
                                            router.push(`?${params.toString()}`)
                                        } else {
                                            const params = new URLSearchParams(searchParams.toString())
                                            params.delete('startDate')
                                            params.delete('endDate')
                                            router.push(`?${params.toString()}`)
                                        }
                                    }}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Type Filter */}
                    <Select
                        value={searchParams.get('type') || 'all'}
                        onValueChange={(val) => handleFilterChange('type', val)}
                    >
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="expense">Expense</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Category Filter */}
                    <Select
                        value={searchParams.get('category') || 'all'}
                        onValueChange={(val) => handleFilterChange('category', val)}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Clear Filters */}
                    {(searchParams.get('startDate') || searchParams.get('type') || searchParams.get('category')) && (
                        <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear Filters">
                            <FilterX className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('date')}>
                                <div className="flex items-center">
                                    Date
                                    {getSortIcon('date')}
                                </div>
                            </TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort('amount')}>
                                <div className="flex items-center justify-end">
                                    Amount ({companyCurrency})
                                    {getSortIcon('amount')}
                                </div>
                            </TableHead>
                            <TableHead className="w-[50px]">Receipt</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map((transaction) => {
                            const isForeignCurrency = transaction.original_currency && transaction.original_currency !== companyCurrency

                            return (
                                <TableRow key={transaction.id}>
                                    <TableCell>
                                        {new Date(transaction.date).toLocaleDateString('es-CL', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            timeZone: 'UTC'
                                        })}
                                    </TableCell>
                                    <TableCell className="font-medium max-w-[300px] truncate" title={transaction.description}>
                                        {transaction.description}
                                    </TableCell>
                                    <TableCell>{transaction.category}</TableCell>
                                    <TableCell>
                                        <Badge variant={transaction.transaction_type === 'income' ? 'default' : 'destructive'}>
                                            {transaction.transaction_type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="font-medium">
                                            {formatCurrency(Number(transaction.amount), companyCurrency)}
                                        </div>
                                        {isForeignCurrency && (
                                            <div className="text-xs text-muted-foreground">
                                                {formatCurrency(Number(transaction.original_amount), transaction.original_currency)}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {transaction.media_url && (
                                            <button
                                                onClick={() => setPreviewUrl(transaction.media_url)}
                                                className="text-muted-foreground hover:text-primary transition-colors"
                                                title="View receipt"
                                            >
                                                <FileImage className="h-4 w-4" />
                                            </button>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                    {isDeleting === transaction.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the transaction.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(transaction.id)} className="bg-destructive hover:bg-destructive/90">
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                        {transactions.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                    No transactions found matching your filters.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Receipt Preview Modal */}
            {previewUrl && (
                <ReceiptPreview
                    url={previewUrl}
                    open={!!previewUrl}
                    onClose={() => setPreviewUrl(null)}
                />
            )}
        </div>
    )
}
