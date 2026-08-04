import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  FiActivity, 
  FiCalendar, 
  FiPhone, 
  FiHome, 
  FiCheckCircle, 
  FiClock, 
  FiBriefcase,
  FiMenu,
  FiX
} from "react-icons/fi";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <div className="flex min-h-svh flex-col bg-background pb-20">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-3">
          <button type="button" className="text-xl text-foreground md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <FiX aria-hidden /> : <FiMenu aria-hidden />}
          </button>
          <div className="flex items-center gap-2 text-primary">
            <FiActivity className="text-2xl" aria-hidden />
            <span className="text-xl font-bold">Biotech Laboratory</span>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted">
          <Link to="/" className="hover:text-primary">Home</Link>
          <Link to="/book" className="hover:text-primary">Home Collection</Link>
          <Link to="/tests" className="hover:text-primary">View Tests</Link>
          <Link to="/admin/login" className="hover:text-primary">Admin</Link>
        </nav>
        <Button asChild size="sm" variant="outline" className="hidden text-xs md:inline-flex">
          <Link to="/book">Book Now</Link>
        </Button>
      </header>

      {isMenuOpen && (
        <div className="md:hidden border-b border-border bg-surface px-4 py-4 space-y-4 fixed top-[61px] left-0 right-0 z-40 shadow-md">
          <Link to="/" className="block text-base font-medium text-foreground hover:text-primary" onClick={() => setIsMenuOpen(false)}>Home</Link>
          <Link to="/book" className="block text-base font-medium text-foreground hover:text-primary" onClick={() => setIsMenuOpen(false)}>Home Collection</Link>
          <Link to="/tests" className="block text-base font-medium text-foreground hover:text-primary" onClick={() => setIsMenuOpen(false)}>View Tests</Link>
          <Link to="/admin/login" className="block text-base font-medium text-foreground hover:text-primary" onClick={() => setIsMenuOpen(false)}>Admin</Link>
          <Button asChild size="sm" className="w-full mt-4">
            <Link to="/book" onClick={() => setIsMenuOpen(false)}>Book Now</Link>
          </Button>
        </div>
      )}

      <main className="flex-1">
        {/* Hero Section */}
        <section className="px-4 py-10 sm:py-16">
          <div className="mx-auto max-w-lg space-y-6">
            <h1 className="text-4xl font-extrabold leading-tight text-foreground sm:text-5xl">
              Professional<br />
              Laboratory<br />
              <span className="text-primary">Home Sample<br />Collection</span>
            </h1>
            <p className="text-muted text-base leading-relaxed sm:text-lg">
              Book your blood test online and get samples collected from the comfort of your home. Fast, accurate, and completely sterile.
            </p>
            <div className="flex flex-col gap-3">
              <Button asChild size="lg" className="w-full text-base">
                <Link to="/book">Book Home Collection</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full text-base">
                <Link to="/tests">View Tests</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="bg-surface px-4 py-10 sm:py-16">
          <div className="mx-auto max-w-lg">
            <h2 className="mb-6 text-center text-2xl font-bold text-foreground">Why Choose Us</h2>
            <div className="space-y-4">
              <Card 
                icon={<FiHome className="text-xl text-primary" />} 
                title="Home Collection" 
                desc="Safe and sterile sample collection at your convenience."
              />
              <Card 
                icon={<FiCheckCircle className="text-xl text-primary" />} 
                title="Certified Lab" 
                desc="ISO 9001:2015 certified for utmost precision."
              />
              <Card 
                icon={<FiClock className="text-xl text-primary" />} 
                title="Fast Reports" 
                desc="Digital reports delivered within 24-48 hours."
              />
              <Card 
                icon={<FiBriefcase className="text-xl text-primary" />} 
                title="Experienced Staff" 
                desc="Highly trained phlebotomists for painless collection."
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-background px-4 py-10 text-sm text-muted">
        <div className="mx-auto max-w-lg space-y-4">
          <p className="font-bold text-foreground">Biotech Laboratory</p>
          <p>© 2026 Biotech Laboratory. ISO 9001:2015 Certified.</p>
          <ul className="space-y-2">
            <li><Link to="/" className="hover:text-primary">Privacy Policy</Link></li>
            <li><Link to="/" className="hover:text-primary">Terms of Service</Link></li>
            <li><Link to="/" className="hover:text-primary">Accreditations</Link></li>
            <li><Link to="/" className="hover:text-primary">Contact Support</Link></li>
            <li className="pt-2"><Link to="/admin/login" className="hover:text-primary">Technician Login</Link></li>
          </ul>
        </div>
      </footer>

      {/* Bottom Sticky Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-surface px-2 py-2 shadow-lg">
        <Button asChild variant="default" className="flex flex-1 flex-col items-center justify-center gap-1 h-auto py-2 rounded-r-none border-r border-primary-light">
          <Link to="/book">
            <FiHome className="text-lg" aria-hidden />
            <span className="text-[10px] font-medium uppercase tracking-wider">Home Collection</span>
          </Link>
        </Button>
        <Button asChild variant="ghost" className="flex flex-1 flex-col items-center justify-center gap-1 h-auto py-2 rounded-l-none text-foreground hover:bg-primary-light">
          <a href="tel:+919876543210">
            <FiPhone className="text-lg" aria-hidden />
            <span className="text-[10px] font-medium uppercase tracking-wider">Call Specialist</span>
          </a>
        </Button>
      </div>
    </div>
  );
}

function Card({ icon, title, desc }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted">{desc}</p>
      </div>
    </div>
  );
}
