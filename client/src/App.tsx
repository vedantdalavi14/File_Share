import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import P2P from "@/pages/p2p";
import UploadShare from "@/pages/upload-share";
import Room from "@/pages/room";
import NotFound from "@/pages/not-found";
import P2PFileShare from './pages/p2p';
import DownloadPage from './pages/download';
import BidirectionalP2PPage from './pages/bidirectional-p2p';
import { Navbar } from './components/Navbar';

function Router() {
  console.log('🧭 Router initialized - SnapShare Hybrid');
  
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/p2p" component={P2P} />
      <Route path="/p2p/:roomId" component={P2PFileShare} />
      <Route path="/upload-share" component={UploadShare} />
      <Route path="/room/:roomId" component={Room} />
      <Route path="/download/:uuid" component={DownloadPage} />
      <Route path="/bidirectional-p2p" component={BidirectionalP2PPage} />
      <Route path="/bidirectional-p2p/:roomId" component={BidirectionalP2PPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <Toaster />
        <Router />
      </main>
    </div>
  );
}

export default App;
