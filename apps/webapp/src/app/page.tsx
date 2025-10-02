import { ArrowRight, BookOpen } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <main className="max-w-3xl mx-auto text-center space-y-8">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
          Track Your Goals,{' '}
          <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            Achieve More
          </span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          A powerful goal management system that helps you break down quarterly objectives into
          weekly and daily actionable tasks.
        </p>

        <div className="space-y-4 max-w-xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="p-4 rounded-lg border bg-card">
              <h3 className="font-semibold mb-2">Quarterly Goals</h3>
              <p className="text-sm text-muted-foreground">
                Set and track your big-picture objectives for the quarter
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <h3 className="font-semibold mb-2">Weekly Planning</h3>
              <p className="text-sm text-muted-foreground">
                Break down goals into manageable weekly milestones
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <h3 className="font-semibold mb-2">Daily Tasks</h3>
              <p className="text-sm text-muted-foreground">
                Stay focused with clear daily action items
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/app/dashboard"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 text-base font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors"
          >
            Try Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 text-base font-medium text-blue-700 bg-white border border-blue-200 rounded-full hover:bg-blue-50 hover:border-blue-300 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Documentation
          </Link>
        </div>
      </main>

      <footer className="mt-20 text-center text-sm text-muted-foreground">
        <p>Start achieving your goals today with our structured approach to goal management.</p>
      </footer>
    </div>
  );
}
