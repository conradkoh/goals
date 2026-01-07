import { ArrowRight, BookOpen } from 'lucide-react';
import Link from 'next/link';

/**
 * V2 Industrial Design System - Home Page
 *
 * Features:
 * - Sharp corners
 * - Bold uppercase headers with wide tracking
 * - Industrial typography
 * - Neutral color palette with color as signal only
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <main className="max-w-3xl mx-auto text-center space-y-8">
        {/* V2 Industrial: Bold uppercase title */}
        <h1 className="text-2xl sm:text-4xl font-bold uppercase tracking-wider">
          Track Your Goals, <span className="text-foreground">Achieve More</span>
        </h1>

        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          A powerful goal management system that helps you break down quarterly objectives into
          weekly and daily actionable tasks.
        </p>

        <div className="space-y-4 max-w-xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            {/* V2 Industrial: Sharp corners, 2px borders, glassmorphism */}
            <div className="p-4 border-2 border-border/10 bg-card/60 backdrop-blur-sm">
              <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2 text-muted-foreground">
                Quarterly Goals
              </h3>
              <p className="text-xs text-muted-foreground">
                Set and track your big-picture objectives for the quarter
              </p>
            </div>
            <div className="p-4 border-2 border-border/10 bg-card/60 backdrop-blur-sm">
              <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2 text-muted-foreground">
                Weekly Planning
              </h3>
              <p className="text-xs text-muted-foreground">
                Break down goals into manageable weekly milestones
              </p>
            </div>
            <div className="p-4 border-2 border-border/10 bg-card/60 backdrop-blur-sm">
              <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2 text-muted-foreground">
                Daily Tasks
              </h3>
              <p className="text-xs text-muted-foreground">
                Stay focused with clear daily action items
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {/* V2 Industrial: Sharp corners, bold uppercase text */}
          <Link
            href="/app"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground bg-primary hover:opacity-90 transition-opacity"
          >
            Try Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider text-foreground bg-transparent border-2 border-border hover:bg-accent transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Documentation
          </Link>
        </div>
      </main>

      <footer className="mt-20 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <p>Start achieving your goals today with our structured approach to goal management.</p>
      </footer>
    </div>
  );
}
