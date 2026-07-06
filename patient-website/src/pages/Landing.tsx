import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Mic, ArrowRight, CheckCircle2, ShieldCheck, Globe2, Building2, Stethoscope, Camera, Heart, MessageSquare, ChevronDown } from "lucide-react";
import { getLenis } from "../utils/lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "framer-motion";

gsap.registerPlugin(ScrollTrigger);

const FAQS = [
  {
    question: "What exactly does Anvaya do?",
    answer: "Anvaya is an intelligent health companion that helps you understand your symptoms using simple language or photos. It provides medical-grade guidance and helps connect you to local clinics if needed."
  },
  {
    question: "Who can use Anvaya?",
    answer: "Anyone looking for quick, reliable health guidance. Whether you are a first-time parent, a rural farmer, or someone seeking sensitive care, our platform is designed to be accessible and easy to use."
  },
  {
    question: "Do I need technical skills to use the app?",
    answer: "Not at all. You can interact with Anvaya simply by speaking into your phone in your preferred language. The voice-first interface makes it incredibly easy to use."
  },
  {
    question: "Can it connect me to local doctors?",
    answer: "Yes! Anvaya is partnered with local Primary Health Centres (PHCs) and district hospitals to seamlessly refer you and help you book appointments when medical attention is required."
  },
  {
    question: "Is my health data secure and private?",
    answer: "Absolutely. We are fully HIPAA and DPDP compliant. Your personal health information is encrypted, and you have complete control over what you share and store."
  },
  {
    question: "How do I get started?",
    answer: "Simply click on the 'Get Started' or 'Login' button at the top of the page. You can register using just your mobile number—no passwords required!"
  }
];

export default function Landing() {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // 1. Get Global Lenis Instance
    const lenis = getLenis();

    let ctx: gsap.Context;

    if (!prefersReducedMotion) {
      // 2. Scroll-Triggered Reveal Animations
      ctx = gsap.context(() => {
        gsap.utils.toArray('.reveal').forEach((el: any) => {
          gsap.from(el, {
            y: 40,
            opacity: 0,
            duration: 1,
            ease: 'power3.out',
            stagger: 0.15,
            scrollTrigger: {
              trigger: el,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
          });
        });
      });
    }

    // 3. Navbar Background Blur Transition
    const handleScroll = ({ scroll }: any) => {
      const navbar = navRef.current;
      if (navbar) {
        if (scroll > 50) {
          navbar.classList.add('bg-[#FAF6EF]/90', 'backdrop-blur-md', 'border-[#E5DFD3]', 'shadow-sm');
          navbar.classList.remove('bg-transparent', 'border-transparent');
        } else {
          navbar.classList.remove('bg-[#FAF6EF]/90', 'backdrop-blur-md', 'border-[#E5DFD3]', 'shadow-sm');
          navbar.classList.add('bg-transparent', 'border-transparent');
        }
      }
    };
    
    if (!prefersReducedMotion && lenis) {
      lenis.on('scroll', handleScroll);
    }

    // 4. Scroll-Spy (Native Intersection Observer)
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            navLinks.forEach((link) => {
              link.classList.remove('text-[#1B4D3E]', 'font-bold');
              link.classList.add('text-[#5C6B66]');
            });
            document
              .querySelector(`.nav-link[href="#${entry.target.id}"]`)
              ?.classList.add('text-[#1B4D3E]', 'font-bold');
            document
              .querySelector(`.nav-link[href="#${entry.target.id}"]`)
              ?.classList.remove('text-[#5C6B66]');
          }
        });
      },
      { rootMargin: '-50% 0px -50% 0px' }
    );
    sections.forEach((section) => observer.observe(section));

    // Intercept nav clicks to use Lenis scrollTo
    const handleNavClick = (e: Event) => {
      const target = e.currentTarget as HTMLAnchorElement;
      const href = target.getAttribute('href');
      if (href?.startsWith('#') && !prefersReducedMotion) {
        e.preventDefault();
        lenis?.scrollTo(href, { offset: -80 });
      }
    };
    navLinks.forEach(link => link.addEventListener('click', handleNavClick));

    return () => {
      if (lenis && !prefersReducedMotion) {
        lenis.off('scroll', handleScroll);
      }
      observer.disconnect();
      if (ctx) ctx.revert();
      ScrollTrigger.getAll().forEach((t: any) => t.kill());
      navLinks.forEach(link => link.removeEventListener('click', handleNavClick));
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF6EF] font-sans text-[#5C6B66]">
      {/* ── Top Navbar ── */}
      <header ref={navRef} className="sticky top-0 z-50 border-b border-transparent bg-transparent transition-all duration-400 ease-in-out">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1B4D3E] font-display text-base text-white">
              அ
            </span>
            <span className="font-display text-xl font-semibold text-[#1C2B27]">
              Anvaya
            </span>
          </div>
          
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="nav-link text-sm text-[#5C6B66] transition-all duration-300 hover:text-[#1B4D3E]">Features</a>
            <a href="#how-it-works" className="nav-link text-sm text-[#5C6B66] transition-all duration-300 hover:text-[#1B4D3E]">How it Works</a>
            <a href="#for-clinics" className="nav-link text-sm text-[#5C6B66] transition-all duration-300 hover:text-[#1B4D3E]">For Clinics</a>
            <a href="#faq" className="nav-link text-sm text-[#5C6B66] transition-all duration-300 hover:text-[#1B4D3E]">FAQ</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-semibold text-[#1B4D3E] hover:text-[#153D31]">
              Login
            </Link>
            <Link
              to="/login"
              className="rounded-full bg-[#1B4D3E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#153D31]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero Section ── */}
        <section id="hero" className="reveal relative overflow-hidden pt-20 pb-12 lg:pt-28 lg:pb-24">
          <div className="mx-auto max-w-7xl px-5 text-center">
            <p className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-[#D97706]">
              Your Health, In Your Language
            </p>
            <h1 className="mx-auto max-w-4xl font-display text-4xl font-semibold leading-tight text-[#1C2B27] sm:text-5xl lg:text-6xl">
              Understand your symptoms. <br className="hidden sm:block" /> Connect with the right care.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#5C6B66]">
              Speak your symptoms or upload a photo to get clear, medical-grade guidance on what to do next, tailored to your local clinics and language.
            </p>
            
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 17 }}>
                <Link
                  to="/login"
                  className="flex items-center gap-2 rounded-full bg-[#1B4D3E] px-8 py-4 text-base font-medium text-white shadow-lg transition-all hover:bg-[#153D31]"
                >
                  Try the Symptom Bot <ArrowRight className="h-5 w-5" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 17 }}>
                <a
                  href="#how-it-works"
                  className="flex items-center gap-2 rounded-full border border-[#E5DFD3] bg-white px-8 py-4 text-base font-medium text-[#1C2B27] transition-all hover:bg-gray-50"
                >
                  See how it works
                </a>
              </motion.div>
            </div>

            {/* Stylized Product Preview */}
            <div className="mx-auto mt-16 max-w-2xl relative">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-b from-[#1B4D3E]/10 to-transparent blur-2xl"></div>
              <div className="relative flex flex-col items-center rounded-3xl border border-[#E5DFD3] bg-white p-6 shadow-2xl md:flex-row md:items-start md:p-8">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#1B4D3E] text-white shadow-lg md:mr-6">
                  <Mic className="h-8 w-8" strokeWidth={2} />
                </div>
                <div className="mt-4 text-left md:mt-0">
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#DCFCE7] px-2.5 py-1 text-xs font-semibold text-[#16A34A]">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Routine
                  </div>
                  <h3 className="font-display text-lg font-semibold text-[#1C2B27]">
                    "I have had a mild headache for two days"
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#5C6B66]">
                    Guidance: Based on your symptoms, this appears to be a routine tension headache. Rest and hydration are recommended. If it worsens, consult a doctor.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Soft Wave Divider */}
        <div className="w-full overflow-hidden leading-none text-white">
          <svg className="block w-full h-[40px] md:h-[60px]" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118,130.42,120.3,192.1,105.18,238.44,93.8,280.9,74.5,321.39,56.44Z" fill="currentColor"></path>
          </svg>
        </div>

        {/* ── Trust / Social Proof Strip ── */}
        <section className="bg-white border-b border-[#E5DFD3] py-8">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-8 px-5 md:justify-between opacity-80">
            <div className="flex items-center gap-2 text-sm font-medium text-[#1C2B27]">
              <Stethoscope className="h-5 w-5 text-[#1B4D3E]" /> 10,000+ Consultations
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-[#1C2B27]">
              <Globe2 className="h-5 w-5 text-[#1B4D3E]" /> Available in 8 languages
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-[#1C2B27]">
              <Building2 className="h-5 w-5 text-[#1B4D3E]" /> Partnered with local PHCs
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-[#1C2B27]">
              <ShieldCheck className="h-5 w-5 text-[#1B4D3E]" /> HIPAA & DPDP Compliant
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section id="how-it-works" className="reveal bg-[#FAF6EF] py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-5 text-center">
            <h2 className="font-display text-3xl font-semibold text-[#1C2B27]">
              How Anvaya Works
            </h2>
            <p className="mt-4 text-[#5C6B66]">A simple, secure path from symptom to care.</p>
            
            <div className="mx-auto mt-16 flex max-w-5xl flex-col items-start gap-12 md:flex-row md:justify-between md:gap-8">
              {/* Step 1 */}
              <div className="flex flex-1 flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white border border-[#E5DFD3] shadow-sm mb-6 relative text-[#1B4D3E]">
                  <span className="absolute -top-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#D97706] text-sm font-bold text-white">1</span>
                  <Mic className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-[#1C2B27] text-lg">Speak or type your symptoms</h3>
                <p className="mt-2 text-sm text-[#5C6B66]">Interact naturally in your own language. No medical terminology needed.</p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-1 flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white border border-[#E5DFD3] shadow-sm mb-6 relative text-[#1B4D3E]">
                  <span className="absolute -top-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#D97706] text-sm font-bold text-white">2</span>
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-[#1C2B27] text-lg">Get trusted guidance</h3>
                <p className="mt-2 text-sm text-[#5C6B66]">Receive clear, actionable steps grounded in trusted medical knowledge.</p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-1 flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white border border-[#E5DFD3] shadow-sm mb-6 relative text-[#1B4D3E]">
                  <span className="absolute -top-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#D97706] text-sm font-bold text-white">3</span>
                  <Building2 className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-[#1C2B27] text-lg">Connect to care</h3>
                <p className="mt-2 text-sm text-[#5C6B66]">Easily locate and schedule a visit with a nearby clinic if required.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Feature Showcase ── */}
        <section id="features" className="reveal bg-white py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-5 flex flex-col gap-24">
            
            {/* Feature 1 */}
            <div className="flex flex-col items-center gap-10 md:flex-row md:gap-16">
              <div className="flex-1 rounded-2xl bg-[#FAF6EF] p-10 flex items-center justify-center min-h-[300px] relative border border-[#E5DFD3]">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-[#E5DFD3] max-w-sm w-full flex items-start gap-4">
                  <div className="bg-[#EAF5F2] p-3 rounded-full text-[#1B4D3E]">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1C2B27] mb-1">Conversational Triage</h4>
                    <p className="text-xs text-[#5C6B66]">I've had a fever for 3 days and chills.</p>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-display text-3xl font-semibold text-[#1C2B27]">Intelligent Symptom Bot</h3>
                <p className="mt-4 text-lg text-[#5C6B66]">
                  Not sure what your symptoms mean? Our conversational AI asks the right questions to help you understand your situation. It's like having a compassionate medical assistant in your pocket.
                </p>
                <ul className="mt-6 space-y-3">
                  <li className="flex items-center gap-2 text-[#1C2B27] font-medium"><CheckCircle2 className="h-5 w-5 text-[#16A34A]" /> Available 24/7</li>
                  <li className="flex items-center gap-2 text-[#1C2B27] font-medium"><CheckCircle2 className="h-5 w-5 text-[#16A34A]" /> Voice-first interface</li>
                </ul>
              </div>
            </div>

            {/* Feature 2 (Reversed) */}
            <div className="flex flex-col items-center gap-10 md:flex-row-reverse md:gap-16">
              <div className="flex-1 rounded-2xl bg-[#FDF2F8] p-10 flex items-center justify-center min-h-[300px] relative border border-pink-100">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-pink-100 max-w-sm w-full flex items-start gap-4">
                  <div className="bg-pink-100 p-3 rounded-full text-[#F472B6]">
                    <Heart className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1C2B27] mb-1">Sensitive Care Bot</h4>
                    <p className="text-xs text-[#5C6B66]">Private, judgment-free space for women's health queries.</p>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-display text-3xl font-semibold text-[#1C2B27]">Private & Sensitive Care</h3>
                <p className="mt-4 text-lg text-[#5C6B66]">
                  Certain health concerns require extra privacy and care. Our specialized bots provide a safe, judgment-free space for women's health, mental health, and other sensitive topics.
                </p>
                <Link to="/login" className="mt-6 inline-flex items-center gap-2 font-semibold text-[#1B4D3E] hover:text-[#153D31]">
                  Learn more about privacy <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-center gap-10 md:flex-row md:gap-16">
              <div className="flex-1 rounded-2xl bg-[#FAF6EF] p-10 flex items-center justify-center min-h-[300px] relative border border-[#E5DFD3]">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-[#E5DFD3] max-w-sm w-full flex items-start gap-4">
                  <div className="bg-[#EAF5F2] p-3 rounded-full text-[#1B4D3E]">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1C2B27] mb-1">Photo-based Screening</h4>
                    <p className="text-xs text-[#5C6B66]">Upload a photo of your skin or eye concern for instant insights.</p>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-display text-3xl font-semibold text-[#1C2B27]">Visual Health Insights</h3>
                <p className="mt-4 text-lg text-[#5C6B66]">
                  Sometimes a picture is worth a thousand words. Securely snap a photo of a skin rash or eye concern, and receive immediate insights to help you decide your next steps.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* ── Testimonial Section ── */}
        <section id="for-clinics" className="reveal bg-[#FAF6EF] py-20 lg:py-28 border-t border-[#E5DFD3]">
          <div className="mx-auto max-w-7xl px-5 text-center">
            <h2 className="font-display text-3xl font-semibold text-[#1C2B27]">
              Trusted by patients across communities
            </h2>
            <div className="mx-auto mt-14 grid max-w-5xl gap-8 md:grid-cols-2">
              <div className="rounded-2xl border border-[#E5DFD3] bg-white p-8 text-left shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-full bg-[#1B4D3E] text-white flex items-center justify-center font-bold text-xl">P</div>
                  <div>
                    <h4 className="font-semibold text-[#1C2B27]">Priya S.</h4>
                    <p className="text-xs text-[#5C6B66]">First-time Mother</p>
                  </div>
                </div>
                <p className="text-[#1C2B27] italic">"When my baby developed a rash in the middle of the night, I was terrified. Anvaya helped me understand it was a common heat rash and guided me on what to do until the clinic opened."</p>
              </div>
              
              <div className="rounded-2xl border border-[#E5DFD3] bg-white p-8 text-left shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-full bg-[#D97706] text-white flex items-center justify-center font-bold text-xl">R</div>
                  <div>
                    <h4 className="font-semibold text-[#1C2B27]">Rahul M.</h4>
                    <p className="text-xs text-[#5C6B66]">Farmer, Rural District</p>
                  </div>
                </div>
                <p className="text-[#1C2B27] italic">"Being able to speak into the app in my own language makes all the difference. It saves me an unnecessary trip to the city hospital and helps me book appointments at my local clinic easily."</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ Section ── */}
        <section id="faq" className="reveal bg-white py-24 border-t border-[#E5DFD3]">
          <div className="mx-auto max-w-4xl px-5">
            <h2 className="font-display text-4xl font-semibold text-center text-[#1C2B27] mb-12">
              Any Questions?
            </h2>
            <div className="space-y-4">
              {FAQS.map((faq, idx) => (
                <FAQItem key={idx} faq={faq} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA Section ── */}
        <section className="reveal bg-[#1B4D3E] py-20 text-center">
          <div className="mx-auto max-w-3xl px-5">
            <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
              Start understanding your health today
            </h2>
            <p className="mt-4 text-teal-100 text-lg">
              Join thousands who have already taken control of their health journey.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 17 }} className="inline-block mt-10">
              <Link
                to="/login"
                className="inline-block rounded-full bg-white px-10 py-4 text-lg font-semibold text-[#1B4D3E] shadow-lg transition-transform"
              >
                Get Started for Free
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#E5DFD3] bg-white pt-16 pb-8">
        <div className="mx-auto max-w-7xl px-5">
          <div className="grid gap-10 md:grid-cols-4 lg:gap-16">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1B4D3E] font-display text-xs text-white">அ</span>
                <span className="font-display text-lg font-semibold text-[#1C2B27]">Anvaya</span>
              </div>
              <p className="text-sm text-[#5C6B66]">
                Bridging the gap between symptoms and care, accessible to everyone, everywhere.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-[#1C2B27] mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-[#5C6B66]">
                <li><a href="#" className="hover:text-[#1B4D3E]">Symptom Bot</a></li>
                <li><a href="#" className="hover:text-[#1B4D3E]">Photo Screening</a></li>
                <li><a href="#" className="hover:text-[#1B4D3E]">Clinic Locator</a></li>
                <li><a href="#" className="hover:text-[#1B4D3E]">Security</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-[#1C2B27] mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-[#5C6B66]">
                <li><a href="#" className="hover:text-[#1B4D3E]">About Us</a></li>
                <li><a href="#" className="hover:text-[#1B4D3E]">Careers</a></li>
                <li><a href="#" className="hover:text-[#1B4D3E]">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-[#1C2B27] mb-4">Languages</h4>
              <ul className="space-y-3 text-sm text-[#5C6B66]">
                <li>English</li>
                <li>हिंदी (Hindi)</li>
                <li>தமிழ் (Tamil)</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-16 border-t border-[#E5DFD3] pt-8 text-center md:flex md:items-center md:justify-between md:text-left">
            <p className="text-sm text-[#5C6B66]">© 2026 Anvaya. All rights reserved.</p>
            <p className="mt-4 text-xs leading-relaxed text-[#5C6B66] md:mt-0 md:max-w-xl">
              <strong className="font-semibold">Disclaimer:</strong> Anvaya provides guidance and is not a substitute for professional medical diagnosis or treatment. Always consult a healthcare professional for medical advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FAQItem({ faq }: { faq: { question: string; answer: string } }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-xl border border-[#E5DFD3] bg-white overflow-hidden transition-all duration-300 shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left focus:outline-none hover:bg-[#FAF6EF]"
      >
        <span className="font-semibold text-[#1C2B27] sm:text-lg">{faq.question}</span>
        <ChevronDown className={`w-5 h-5 text-[#1B4D3E] transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <div 
        className={`px-6 text-[#5C6B66] overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-96 pb-6 opacity-100" : "max-h-0 opacity-0"}`}
      >
        {faq.answer}
      </div>
    </div>
  );
}
