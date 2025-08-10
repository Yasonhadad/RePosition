import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Users, BarChart3, Zap, Shield, TrendingUp } from "lucide-react";

export function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 pt-24">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-6">
            Welcome to RePosition
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Advanced football analytics platform powered by machine learning. 
            Discover player insights, position compatibility, and build winning teams with data-driven decisions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth">
              <Button size="lg" className="text-lg px-8 py-3">
                Sign In to Get Started
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Advanced Player Search</CardTitle>
              <CardDescription>
                Search through thousands of players with intelligent filters and real-time results
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>Position Compatibility</CardTitle>
              <CardDescription>
                AI-powered analysis to find the perfect position fit for every player
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Team Analytics</CardTitle>
              <CardDescription>
                Comprehensive team analysis with performance metrics and insights
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Stats Section */}
        <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
          <CardContent className="p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-primary mb-2">3,946</div>
                <div className="text-muted-foreground">Players</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-accent mb-2">439</div>
                <div className="text-muted-foreground">Teams</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">18</div>
                <div className="text-muted-foreground">Competitions</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-accent mb-2">ML</div>
                <div className="text-muted-foreground">Powered</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Analyzing?</h2>
          <p className="text-muted-foreground mb-8">
            Join REPOSITION and unlock the power of football analytics
          </p>
          <Link href="/auth">
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-3"
            >
              Sign In Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}