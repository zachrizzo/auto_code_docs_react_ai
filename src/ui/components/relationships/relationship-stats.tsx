"use client"

import { Card, CardContent } from "../ui/card"
import { RelationshipStatsData } from "./types"

interface RelationshipStatsProps {
  stats: RelationshipStatsData
  componentsCount: number
}

export function RelationshipStats({ stats, componentsCount }: RelationshipStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</div>
          <div className="text-sm text-blue-700 dark:text-blue-300">Total Relations</div>
        </CardContent>
      </Card>
      
      {Object.entries(stats.byType).map(([type, count]) => (
        <Card key={type} className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/20 dark:to-slate-800/20 border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-600 dark:text-slate-400">{count}</div>
            <div className="text-sm text-slate-700 dark:text-slate-300 capitalize">{type}</div>
          </CardContent>
        </Card>
      ))}
      
      {stats.mostConnected.connections > 0 && (
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400 truncate">
              {stats.mostConnected.name}
            </div>
            <div className="text-sm text-purple-700 dark:text-purple-300">
              Most Connected ({stats.mostConnected.connections})
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Data Source Info */}
      {componentsCount > 0 && (
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              Real Data
            </div>
            <div className="text-sm text-green-700 dark:text-green-300">
              Extracted from your actual codebase
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}