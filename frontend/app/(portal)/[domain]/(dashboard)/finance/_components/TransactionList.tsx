'use client'

import { useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileImage } from "lucide-react"
import { ReceiptPreview } from './ReceiptPreview'
import { formatCurrency } from '@/lib/utils/currency'

interface TransactionListProps {
    transactions: any[]
    companyCurrency: string
}

export function TransactionList({ transactions, companyCurrency }: TransactionListProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Amount ({companyCurrency})</TableHead>
                            <TableHead className="w-[40px]"></TableHead>
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
                                    <TableCell className="font-medium">{transaction.description}</TableCell>
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
                                </TableRow>
                            )
                        })}
                        {transactions.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    No transactions found.
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
        </>
    )
}
