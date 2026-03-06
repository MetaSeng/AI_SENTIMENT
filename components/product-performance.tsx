"use client"

import { useEffect, useState } from "react"
import { Search, X, MessageSquare } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Skeleton } from "@/components/ui/skeleton"
import { getProducts } from "@/lib/api"
import { useApp } from "@/components/app-provider"
import type { Product, Sentiment } from "@/lib/types"

const SENTIMENT_COLORS = {
  positive: "oklch(0.65 0.2 155)",
  neutral: "oklch(0.55 0.01 250)",
  negative: "oklch(0.6 0.2 30)",
}

function SentimentBar({ positive, neutral, negative }: { positive: number; neutral: number; negative: number }) {
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full">
      <div
        className="h-full transition-all"
        style={{ width: `${positive}%`, backgroundColor: SENTIMENT_COLORS.positive }}
      />
      <div
        className="h-full transition-all"
        style={{ width: `${neutral}%`, backgroundColor: SENTIMENT_COLORS.neutral }}
      />
      <div
        className="h-full transition-all"
        style={{ width: `${negative}%`, backgroundColor: SENTIMENT_COLORS.negative }}
      />
    </div>
  )
}

function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  const variants: Record<Sentiment, { label: string; className: string }> = {
    positive: {
      label: "Positive",
      className: "bg-success/10 text-success hover:bg-success/20 border-success/20",
    },
    neutral: {
      label: "Neutral",
      className: "bg-muted text-muted-foreground hover:bg-muted border-border",
    },
    negative: {
      label: "Negative",
      className: "bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20",
    },
  }
  const v = variants[sentiment]
  return (
    <Badge variant="outline" className={v.className}>
      {v.label}
    </Badge>
  )
}

function ProductDetailModal({
  product,
  open,
  onClose,
}: {
  product: Product | null
  open: boolean
  onClose: () => void
}) {
  if (!product) return null

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {product.name}
            <Badge variant="secondary" className="text-xs font-normal">
              {product.category}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {product.mentionCount} total mentions | Avg sentiment: {Math.round(product.avgSentimentScore * 100)}%
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="comments" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="comments" className="flex-1">Comments</TabsTrigger>
            <TabsTrigger value="trend" className="flex-1">Trend</TabsTrigger>
            <TabsTrigger value="keywords" className="flex-1">Keywords</TabsTrigger>
          </TabsList>

          <TabsContent value="comments" className="mt-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Comment</TableHead>
                    <TableHead>Sentiment</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.comments.length > 0 ? (
                    product.comments.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="max-w-xs truncate">{c.text}</TableCell>
                        <TableCell>
                          <SentimentBadge sentiment={c.sentiment} />
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{c.date}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No comments in current dataset for this product.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="trend" className="mt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={product.trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Line type="monotone" dataKey="positive" stroke={SENTIMENT_COLORS.positive} strokeWidth={2} name="Positive" />
                  <Line type="monotone" dataKey="neutral" stroke={SENTIMENT_COLORS.neutral} strokeWidth={2} name="Neutral" />
                  <Line type="monotone" dataKey="negative" stroke={SENTIMENT_COLORS.negative} strokeWidth={2} name="Negative" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="keywords" className="mt-4">
            <div className="flex flex-wrap gap-2">
              {product.keywords.map((kw) => (
                <div
                  key={kw.word}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: SENTIMENT_COLORS[kw.sentiment] }}
                  />
                  <span className="text-sm font-medium text-foreground">{kw.word}</span>
                  <span className="text-xs text-muted-foreground">({kw.count})</span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export function ProductPerformance() {
  const { demoMode, dateRangePreset, customDateFrom, customDateTo } = useApp()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sentimentFilter, setSentimentFilter] = useState<string>("all")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await getProducts(demoMode, {
        preset: dateRangePreset,
        from: customDateFrom,
        to: customDateTo,
      })
      setProducts(data)
      setLoading(false)
    }
    load()
  }, [demoMode, dateRangePreset, customDateFrom, customDateTo])

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    if (sentimentFilter === "all") return matchesSearch
    if (sentimentFilter === "positive") return matchesSearch && p.positivePercent >= 70
    if (sentimentFilter === "negative") return matchesSearch && p.negativePercent >= 20
    return matchesSearch
  })

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product)
    setModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-72 rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Product Performance</h2>
        <p className="text-sm text-muted-foreground">
          Track how each product is perceived by customers.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter sentiment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            <SelectItem value="positive">Mostly Positive</SelectItem>
            <SelectItem value="negative">Has Issues</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Product Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="border-border/60 transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{product.name}</CardTitle>
                  <CardDescription>{product.category}</CardDescription>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  <MessageSquare className="mr-1 h-3 w-3" />
                  {product.mentionCount}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Sentiment bar */}
              <div className="flex flex-col gap-2">
                <SentimentBar
                  positive={product.positivePercent}
                  neutral={product.neutralPercent}
                  negative={product.negativePercent}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span style={{ color: SENTIMENT_COLORS.positive }}>
                    {product.positivePercent}% positive
                  </span>
                  <span style={{ color: SENTIMENT_COLORS.negative }}>
                    {product.negativePercent}% negative
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleViewDetails(product)}
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No products match your filters.</p>
        </div>
      )}

      <ProductDetailModal
        product={selectedProduct}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
