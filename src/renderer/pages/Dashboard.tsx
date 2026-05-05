import { useState } from "react";
import { ProjectCard, NewProjectCard } from "../components/ProjectCard";
import { TopNav } from "../components/layout/TopNav";
import { Dialog } from "../components/ui/Dialog";
import { useNavigate } from "react-router-dom";

const projects = [
  {
    title: "Acme Corp Landing",
    url: "https://acme-corp.webmod.pro",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAJ1b3yhitrCLtf0Fi-1j6DsgYq505N7691PNbQu713ekETrjjy_o3luorKXV9aTQvaqjnyWx71VG8xtf7O2WHBq129yJ4k8BZyXuBi85oH2A2V-g2yeDfwhGWg26KYAkSbWe3AYsg01zwSV5xpihcyYDgNDgttFXu0RiN2oyMsBoH5DHdy02mv6TZ5cEERVlsajVZjiEaKqlXYqLrqfHDdFDQc-e2DSl7Pic8VXzo5AV7wD1Mx6YypPV9sLSdQTkX0h2TMBIqHT9s",
    lastEdit: "2 hours ago",
    isHero: true,
    isActive: true,
  },
  {
    title: "Travel Blog",
    url: "travel-exp.io",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBiLl_95w9_A0xlBdZHMEs8XC2yG_C6tjsY4MmVvlig3IQNmIaW_-hVQ1BvSDVmygevSFQFrm0iVf_ykKGeCGqQqaZs04Q944XMqaKKlJ8hHDKOOrAgtxhAD972gfEwrGR8kDBh-ux6hKsk7zJlKB0VhgY8AP80hG9nMx5Wbl841gCqtv5YJ0AqHUbksuGWvmzJs4yZMFEJ8pk86WyC_xLmCx_U6w5Rf2IGUoWJQvekd1BXuKlTkkk8udwz5pAnyCXPrifZ55e4GOs",
    lastEdit: "Oct 12, 2023",
  },
  {
    title: "SaaS Dashboard",
    url: "app.vortex-systems.com",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDsWPOxF9UdRKqqz7_Z1PQty_F5ePXRGjUfjBzzTeIXkG95XcyganiV5KNTA-H4cKMn99yqtefaQIu_KFAtsmoJGoLG1jwNev9cYx7hIMNsh6-OkOVGOeCl5kSSfQtQ0Nt-zB6r3DDrt1YqcKwg-DFUfcaEcwGMdhpYVVI_cQVbsZ4y5cuCOGJe6Z2SLhMZOeQinxRRlOiIEfENkPc4Ekm3_yQPO090T_s0mxQPaVOFb3p2e5RW34VWcVw0cEtwbqEGEfe5S69P-PM",
    lastEdit: "Oct 10, 2023",
  },
  {
    title: "Retail Flux",
    url: "shop.flux-retail.com",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDIzhqeDurTalypg4oXSYUDXLZUX-7sq5NjMG1Z8fWjLEx_0896j9W4oVMN2aFW8BlLmuwxkDigzYkDrJnGtfUYynDWvwssTjQL_24fs0_IT9V6Z6fWD0NUBNJUI3kBGTKRdWdxxkEiv6mvPv_D_zF2pttB_tGp3fDvQ93nvoLhn7B1OJdxTyVgQMP-oVQC-lhN3em9xepg-lfFt9BArPeUAGywd2pH3ANuxcv38cPr2yd0bQlJnv6gzEvu9Y5TVNvzIhb0Nxbwn-8",
    lastEdit: "Sep 28, 2023",
  },
  {
    title: "Portfolio 2024",
    url: "jdoe-creative.work",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuByyzIxtf1SzWhouCvOnKC_64F-9aMHZH1zq8r4vPH-YudlySPHyvc767eHG7lt5LGE8du3N-TfArxtw7HU7he76XjX1ii5fynE8GuBJJIApIqH0fe1B30RdlgPlAGZ--9gEwtRfxy4aVD50dufsY37DhWg1GZE5u0OvYBQiY4qPk7hAaLqIkJCDF16iHMb4hIsVafydkOiStH69ApANldjRV7QHoiX00wU-VZa3HmyOs6Imj5Bar9WhkaQjriEch4AyZBBuPRTkKw",
    lastEdit: "Sep 15, 2023",
  },
];

export function Dashboard() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [url, setUrl] = useState("");

  const handleCreate = () => {
    setDialogOpen(false);
    navigate("/editor");
  };

  return (
    <>
      <TopNav />
      <main className="mt-12 p-lg min-h-[calc(100vh-48px)] bg-[#020617]">
      {/* Dashboard Header */}
      <section className="flex justify-between items-end mb-xl">
        <div className="space-y-xs">
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            Recent Projects
          </h1>
          <p className="font-body-main text-on-surface-variant opacity-70">
            Manage and iterate on your active workspace deployments.
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="bg-primary hover:bg-surface-tint text-on-primary-fixed flex items-center gap-sm px-lg py-md rounded transition-all font-ui-small font-bold shadow-lg shadow-primary/10"
        >
          <span className="material-symbols-outlined">add_circle</span>
          New Project
        </button>
      </section>

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
        {projects.map((project) => (
          <ProjectCard key={project.title} {...project} />
        ))}
        <NewProjectCard />
      </div>

      {/* Bottom Section */}
      <div className="mt-xl grid grid-cols-1 lg:grid-cols-3 gap-md">
        {/* Activity Feed */}
        <div className="lg:col-span-1 bg-surface-container-low border border-outline-variant/20 p-md">
          <h4 className="font-label-caps text-label-caps text-secondary mb-md border-b border-outline-variant/20 pb-sm">
            Recent Activity
          </h4>
          <div className="space-y-md">
            <div className="flex gap-sm">
              <span className="material-symbols-outlined text-xs text-on-primary">
                check_circle
              </span>
              <div className="space-y-unit">
                <p className="text-ui-small text-on-surface">
                  Successfully deployed{" "}
                  <span className="text-primary">Acme Corp Landing</span>
                </p>
                <p className="text-[10px] text-on-surface-variant opacity-50">
                  12:45 PM Today
                </p>
              </div>
            </div>
            <div className="flex gap-sm">
              <span className="material-symbols-outlined text-xs text-tertiary">
                edit
              </span>
              <div className="space-y-unit">
                <p className="text-ui-small text-on-surface">
                  Asset updated in{" "}
                  <span className="text-primary">Travel Blog</span>
                </p>
                <p className="text-[10px] text-on-surface-variant opacity-50">
                  Yesterday
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Usage */}
        <div className="lg:col-span-2 bg-surface-container-low border border-outline-variant/20 p-md flex items-center justify-between">
          <div>
            <h4 className="font-label-caps text-label-caps text-secondary mb-md border-b border-outline-variant/20 pb-sm">
              Workspace Usage
            </h4>
            <div className="flex items-end gap-xl">
              <div className="space-y-xs">
                <span className="text-headline-lg font-headline-lg text-on-surface">
                  12 / 20
                </span>
                <p className="text-ui-small text-on-surface-variant">
                  Projects Active
                </p>
              </div>
              <div className="space-y-xs">
                <span className="text-headline-lg font-headline-lg text-on-surface">
                  4.2GB
                </span>
                <p className="text-ui-small text-on-surface-variant">
                  Assets Stored
                </p>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <button className="bg-surface-container-highest border border-outline text-on-surface px-md py-sm rounded hover:bg-surface-bright transition-all text-ui-small font-bold">
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>
    </main>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <h2 className="font-headline-md text-headline-md text-on-surface mb-sm">
          New Project
        </h2>
        <p className="text-body-main text-on-surface-variant mb-lg">
          Paste the URL of the website you want to mock.
        </p>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-md py-sm text-body-main text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors mb-lg"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && url.trim()) handleCreate();
          }}
        />
        <div className="flex justify-end">
          <button
            onClick={handleCreate}
            disabled={!url.trim()}
            className="bg-primary-container text-on-primary-container px-lg py-sm font-ui-small text-ui-small rounded-lg cursor-pointer active:opacity-80 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create
          </button>
        </div>
      </Dialog>
    </>
  );
}
