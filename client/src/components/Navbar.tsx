import { Link } from 'wouter';
import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { Shield, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-20 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-3">
            <img src="/heart.png" alt="File Share Logo" className="h-8 w-8" />
            <span className="font-bold text-4xl">
              File Share
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <a href="https://vedantdalavi.vercel.app/" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="icon">
              <User className="h-[1.2rem] w-[1.2rem]" />
            </Button>
          </a>
          <a href="https://github.com/vedantdalavi14/File_Share" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="icon">
              <GitHubLogoIcon className="h-[1.2rem] w-[1.2rem]" />
            </Button>
          </a>
          <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700 shadow-sm shadow-green-500/10">
            <Shield className="h-3 w-3 mr-1.5" />
            End-to-end encrypted
          </Badge>
        </div>
      </div>
    </header>
  );
} 