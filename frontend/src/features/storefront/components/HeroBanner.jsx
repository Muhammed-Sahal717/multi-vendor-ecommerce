import { Link } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Truck,
  Headphones,
} from "lucide-react";
import { Button } from "../../../components/ui/button.jsx";
import { ROUTE_PATHS } from "../../../routes/routePaths.js";
import heroImg from "../../../assets/hero.png";

export const HeroBanner = () => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-neutral-900 text-white">
      {/* Background Decorative Gradients */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-orange-600/20 blur-3xl" />

      <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-between gap-12 px-6 py-16 md:flex-row md:py-20 lg:px-12">
        {/* Left Copy */}
        <div className="max-w-xl text-center md:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-800/80 px-3.5 py-1 text-xs font-medium text-amber-400 backdrop-blur-xs">
            <Sparkles size={14} />
            <span>Discover Verified Multi-Vendor Marketplace</span>
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            Everything you need, in one{" "}
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
              Galla.
            </span>
          </h1>

          <p className="mt-4 text-base text-neutral-300 sm:text-lg">
            Shop authentic products from trusted verified sellers across the
            nation. Fast delivery, safe COD & online payments, and easy returns.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 md:justify-start">
            <Button
              asChild
              size="lg"
              className="bg-amber-500 font-semibold text-neutral-950 hover:bg-amber-400"
            >
              <Link to={ROUTE_PATHS.STOREFRONT.PRODUCTS}>
                Shop Now <ArrowRight size={18} className="ml-1" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-neutral-700 bg-transparent text-white hover:bg-neutral-800"
            >
              <Link to={ROUTE_PATHS.STOREFRONT.CATEGORIES}>
                Explore Categories
              </Link>
            </Button>
          </div>

          {/* Highlights */}
          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-neutral-800 pt-6 text-left">
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <ShieldCheck size={18} className="text-amber-400 shrink-0" />
              <span>100% Verified Sellers</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <Truck size={18} className="text-amber-400 shrink-0" />
              <span>Fast Shipping & COD</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <Headphones size={18} className="text-amber-400 shrink-0" />
              <span>24/7 Buyer Support</span>
            </div>
          </div>
        </div>

        {/* Right Hero Image / Artwork */}
        <div className="relative flex w-full max-w-md items-center justify-center md:max-w-lg">
          <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-800/50 p-2 shadow-2xl backdrop-blur-xs">
            <img
              src={heroImg}
              alt="Galla Marketplace Showcase"
              className="h-auto w-full max-w-sm rounded-xl object-contain drop-shadow-xl"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroBanner;
