import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  LayoutList,
  Monitor,
  Plus,
  RotateCcw,
  Save,
  Smartphone,
  Upload,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { HomepageLayoutRenderer } from "@/components/store/HomepageLayoutRenderer";
import {
  createHomepageMedia,
  homepageSectionName,
  layoutsEqual,
  type HomepageCrop,
  type HomepageEditorState,
  type HomepageLayout,
  type HomepageMedia,
  type HomepageSection,
} from "@/lib/homepageLayout";
import { storefrontProductFromSource } from "@/lib/products";
import { cn } from "@/lib/utils";
import { uploadProductImage } from "@/services/adminService";
import {
  discardHomepageDraft,
  getHomepageEditorState,
  initializeHomepageEditor,
  publishHomepageDraft,
  restoreHomepageRevision,
  saveHomepageDraft,
} from "@/services/homepageService";
import type { Product as AdminProduct } from "@/services/productService";

type EditorMode = "visual" | "form";
type PreviewDevice = "mobile" | "desktop";
type SaveStatus = "loading" | "saved" | "unsaved" | "saving" | "error";
type ConfirmAction =
  | { type: "publish" }
  | { type: "discard" }
  | { type: "restore"; revisionId: string; version: number }
  | null;

const EDITOR_MODE_KEY = "badr-homepage-editor-mode-v1";

function message(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function isConflict(error: unknown) {
  return message(error).includes("another admin session");
}

export function HomepageEditor({ products }: { products: AdminProduct[] }) {
  const storefrontProducts = useMemo(
    () =>
      products
        .filter((product) => product.is_active !== false)
        .map((product) =>
          storefrontProductFromSource(product as unknown as Record<string, unknown>),
        ),
    [products],
  );
  const [editorState, setEditorState] = useState<HomepageEditorState | null>(null);
  const [layout, setLayout] = useState<HomepageLayout | null>(null);
  const [mode, setMode] = useState<EditorMode>(() => {
    if (typeof window === "undefined") return "visual";
    return window.localStorage.getItem(EDITOR_MODE_KEY) === "form" ? "form" : "visual";
  });
  const [device, setDevice] = useState<PreviewDevice>("mobile");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [publishSummary, setPublishSummary] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const layoutRef = useRef<HomepageLayout | null>(null);
  const stateRef = useRef<HomepageEditorState | null>(null);
  const versionRef = useRef(0);
  const savedJsonRef = useRef("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savePromiseRef = useRef<Promise<HomepageEditorState> | null>(null);

  const applyServerState = useCallback((next: HomepageEditorState) => {
    stateRef.current = next;
    versionRef.current = next.draftVersion;
    layoutRef.current = next.draft;
    savedJsonRef.current = JSON.stringify(next.draft);
    setEditorState(next);
    setLayout(next.draft);
    setSelectedId((current) =>
      current && next.draft.sections.some((section) => section.id === current)
        ? current
        : (next.draft.sections[0]?.id ?? null),
    );
    setSaveStatus("saved");
  }, []);

  const reloadEditor = useCallback(async () => {
    setSaveStatus("loading");
    try {
      const existing = await getHomepageEditorState();
      applyServerState(existing ?? (await initializeHomepageEditor()));
    } catch (error) {
      setSaveStatus("error");
      toast.error("Homepage editor could not load", { description: message(error) });
    }
  }, [applyServerState]);

  useEffect(() => {
    void reloadEditor();
  }, [reloadEditor]);

  const persistLatestDraft = useCallback(async (): Promise<HomepageEditorState> => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (savePromiseRef.current) {
      await savePromiseRef.current;
      if (JSON.stringify(layoutRef.current) !== savedJsonRef.current) return persistLatestDraft();
      return stateRef.current as HomepageEditorState;
    }
    const snapshot = layoutRef.current;
    const currentState = stateRef.current;
    if (!snapshot || !currentState) throw new Error("The homepage draft is not ready yet.");
    if (JSON.stringify(snapshot) === savedJsonRef.current) return currentState;

    setSaveStatus("saving");
    const work = saveHomepageDraft(snapshot, versionRef.current);
    savePromiseRef.current = work;
    try {
      const saved = await work;
      stateRef.current = saved;
      versionRef.current = saved.draftVersion;
      savedJsonRef.current = JSON.stringify(saved.draft);
      setEditorState(saved);
      setSaveStatus(
        JSON.stringify(layoutRef.current) === savedJsonRef.current ? "saved" : "unsaved",
      );
      return saved;
    } catch (error) {
      setSaveStatus("error");
      if (isConflict(error)) {
        toast.error("Draft changed in another admin session", {
          description: "Reload the editor before making more changes.",
        });
      } else {
        toast.error("Draft could not save", { description: message(error) });
      }
      throw error;
    } finally {
      savePromiseRef.current = null;
    }
  }, []);

  const scheduleSave = useCallback(() => {
    setSaveStatus("unsaved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persistLatestDraft();
    }, 900);
  }, [persistLatestDraft]);

  useEffect(() => {
    const warnAboutUnsavedDraft = (event: BeforeUnloadEvent) => {
      if (JSON.stringify(layoutRef.current) === savedJsonRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnAboutUnsavedDraft);
    return () => {
      window.removeEventListener("beforeunload", warnAboutUnsavedDraft);
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        void persistLatestDraft();
      }
    };
  }, [persistLatestDraft]);

  const changeLayout = useCallback(
    (update: (current: HomepageLayout) => HomepageLayout) => {
      const current = layoutRef.current;
      if (!current) return;
      const next = update(current);
      layoutRef.current = next;
      setLayout(next);
      scheduleSave();
    },
    [scheduleSave],
  );

  const updateSection = useCallback(
    (sectionId: string, update: (section: HomepageSection) => HomepageSection) => {
      changeLayout((current) => ({
        ...current,
        sections: current.sections.map((section) =>
          section.id === sectionId ? update(section) : section,
        ),
      }));
    },
    [changeLayout],
  );

  const moveSection = useCallback(
    (sectionId: string, direction: -1 | 1) => {
      changeLayout((current) => {
        const from = current.sections.findIndex((section) => section.id === sectionId);
        if (from <= 0) return current;
        const to = from + direction;
        if (to <= 0 || to >= current.sections.length) return current;
        const sections = [...current.sections];
        [sections[from], sections[to]] = [sections[to], sections[from]];
        return { ...current, sections };
      });
    },
    [changeLayout],
  );

  const moveSectionTo = useCallback(
    (sectionId: string, targetId: string) => {
      if (sectionId === targetId || sectionId === "hero" || targetId === "hero") return;
      changeLayout((current) => {
        const sections = [...current.sections];
        const from = sections.findIndex((section) => section.id === sectionId);
        const to = sections.findIndex((section) => section.id === targetId);
        if (from < 1 || to < 1) return current;
        const [section] = sections.splice(from, 1);
        sections.splice(to, 0, section);
        return { ...current, sections };
      });
    },
    [changeLayout],
  );

  const addBanner = () => {
    const id = `promo-${crypto.randomUUID()}`;
    const banner: HomepageSection = {
      id,
      type: "promo",
      visible: true,
      productId: null,
      media: createHomepageMedia(),
      eyebrow: "",
      headline: "New banner",
      subtext: "",
      ctaLabel: "Shop now",
      ctaHref: "/shop",
      textAlign: "center",
    };
    changeLayout((current) => {
      const collectionIndex = current.sections.findIndex(
        (section) => section.type === "collection",
      );
      const sections = [...current.sections];
      sections.splice(collectionIndex >= 0 ? collectionIndex : sections.length, 0, banner);
      return { ...current, sections };
    });
    setSelectedId(id);
    setOpenId(id);
    toast.success("Promotional banner added to the private draft");
  };

  const performConfirmedAction = async () => {
    if (!confirmAction || !editorState) return;
    setActionBusy(true);
    try {
      if (confirmAction.type === "publish") {
        await persistLatestDraft();
        const published = await publishHomepageDraft(
          versionRef.current,
          publishSummary || undefined,
        );
        applyServerState(published);
        setPublishSummary("");
        toast.success("Homepage published", { description: "Visitors now see this version." });
      } else if (confirmAction.type === "discard") {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        const discarded = await discardHomepageDraft(versionRef.current);
        applyServerState(discarded);
        toast.success("Draft discarded");
      } else {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        const restored = await restoreHomepageRevision(
          confirmAction.revisionId,
          versionRef.current,
        );
        applyServerState(restored);
        toast.success(`Homepage version ${confirmAction.version} restored`);
      }
      setConfirmAction(null);
    } catch (error) {
      toast.error("Homepage action failed", { description: message(error) });
    } finally {
      setActionBusy(false);
    }
  };

  const publishedMatchesDraft = Boolean(
    editorState && layout && layoutsEqual(layout, editorState.published),
  );
  const selectedSection = layout?.sections.find((section) => section.id === selectedId) ?? null;

  if (!layout || !editorState) {
    return (
      <div className="grid min-h-[420px] place-items-center border border-[rgb(var(--vibe-border))] bg-white p-8 text-center">
        <div>
          <p className="text-base font-semibold">Loading homepage editor…</p>
          {saveStatus === "error" ? (
            <button type="button" className="admin-button mt-4" onClick={() => void reloadEditor()}>
              Try again
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-30 border border-[rgb(var(--vibe-border))] bg-white/95 p-3 shadow-sm backdrop-blur sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-base font-semibold">Homepage editor</h2>
            <p className="mt-0.5 text-xs text-[rgb(var(--vibe-muted))]">
              {saveStatus === "saving"
                ? "Saving private draft…"
                : saveStatus === "unsaved"
                  ? "Unsaved draft changes"
                  : saveStatus === "error"
                    ? "Draft needs attention"
                    : publishedMatchesDraft
                      ? "Draft saved · matches the live homepage"
                      : "Draft saved · unpublished changes"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="grid flex-1 grid-cols-2 border border-[rgb(var(--vibe-border))] p-1 sm:flex-none">
              <ModeButton
                active={mode === "visual"}
                onClick={() => setModeAndRemember("visual", setMode)}
              >
                <Eye className="h-4 w-4" /> Visual
              </ModeButton>
              <ModeButton
                active={mode === "form"}
                onClick={() => setModeAndRemember("form", setMode)}
              >
                <LayoutList className="h-4 w-4" /> Forms
              </ModeButton>
            </div>
            <button
              type="button"
              className="admin-button admin-button-secondary"
              disabled={publishedMatchesDraft || actionBusy}
              onClick={() => setConfirmAction({ type: "discard" })}
            >
              Discard
            </button>
            <button
              type="button"
              className="admin-button"
              disabled={publishedMatchesDraft || actionBusy || saveStatus === "error"}
              onClick={() => setConfirmAction({ type: "publish" })}
            >
              <Save className="h-4 w-4" /> Publish
            </button>
          </div>
        </div>
      </div>

      {mode === "visual" ? (
        <VisualEditor
          layout={layout}
          products={storefrontProducts}
          device={device}
          onDeviceChange={setDevice}
          selectedId={selectedId}
          onSelect={setSelectedId}
          selectedSection={selectedSection}
          updateSection={updateSection}
          uploadBusy={actionBusy}
        />
      ) : (
        <FormEditor
          layout={layout}
          products={storefrontProducts}
          openId={openId}
          onOpen={setOpenId}
          updateSection={updateSection}
          moveSection={moveSection}
          draggedId={draggedId}
          setDraggedId={setDraggedId}
          moveSectionTo={moveSectionTo}
        />
      )}

      <div className="flex flex-col gap-3 border border-dashed border-[rgb(var(--vibe-border))] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Add another homepage banner</p>
          <p className="text-xs text-[rgb(var(--vibe-muted))]">
            Link it to a product or use any safe custom page link.
          </p>
        </div>
        <button type="button" className="admin-button" onClick={addBanner}>
          <Plus className="h-4 w-4" /> Add banner
        </button>
      </div>

      <details className="border border-[rgb(var(--vibe-border))] bg-white">
        <summary className="cursor-pointer list-none p-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
          Published versions ({editorState.revisions.length})
        </summary>
        <div className="space-y-2 border-t border-[rgb(var(--vibe-border))] p-4">
          {editorState.revisions.length ? (
            editorState.revisions.map((revision) => (
              <div
                key={revision.id}
                className="flex flex-col gap-2 border border-[rgb(var(--vibe-border))] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium">Version {revision.version}</p>
                  <p className="text-xs text-[rgb(var(--vibe-muted))]">
                    {new Date(revision.publishedAt).toLocaleString()} ·{" "}
                    {revision.summary || "Published homepage"}
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-button admin-button-secondary"
                  onClick={() =>
                    setConfirmAction({
                      type: "restore",
                      revisionId: revision.id,
                      version: revision.version,
                    })
                  }
                >
                  Restore
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm text-[rgb(var(--vibe-muted))]">
              Earlier versions will appear after the first new publish.
            </p>
          )}
        </div>
      </details>

      {confirmAction ? (
        <ConfirmDialog
          action={confirmAction}
          busy={actionBusy}
          publishSummary={publishSummary}
          onSummaryChange={setPublishSummary}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => void performConfirmedAction()}
        />
      ) : null}
    </div>
  );
}

function setModeAndRemember(mode: EditorMode, setMode: (mode: EditorMode) => void) {
  setMode(mode);
  window.localStorage.setItem(EDITOR_MODE_KEY, mode);
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-9 items-center justify-center gap-2 px-3 text-xs font-medium",
        active ? "bg-black text-white" : "text-[rgb(var(--vibe-muted))] hover:bg-black/5",
      )}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function VisualEditor({
  layout,
  products,
  device,
  onDeviceChange,
  selectedId,
  onSelect,
  selectedSection,
  updateSection,
}: {
  layout: HomepageLayout;
  products: ReturnType<typeof storefrontProductFromSource>[];
  device: PreviewDevice;
  onDeviceChange: (device: PreviewDevice) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  selectedSection: HomepageSection | null;
  updateSection: (id: string, update: (section: HomepageSection) => HomepageSection) => void;
  uploadBusy: boolean;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 border border-[rgb(var(--vibe-border))] bg-[#e8e8e8] p-3 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Click any section to edit it</p>
            <p className="text-xs text-[rgb(var(--vibe-muted))]">
              This preview uses the private draft.
            </p>
          </div>
          <div className="grid grid-cols-2 border border-[rgb(var(--vibe-border))] bg-white p-1">
            <ModeButton active={device === "mobile"} onClick={() => onDeviceChange("mobile")}>
              <Smartphone className="h-4 w-4" />
            </ModeButton>
            <ModeButton active={device === "desktop"} onClick={() => onDeviceChange("desktop")}>
              <Monitor className="h-4 w-4" />
            </ModeButton>
          </div>
        </div>
        <div
          className={cn(
            "mx-auto max-h-[76vh] overflow-y-auto bg-white shadow-xl transition-[width]",
            device === "mobile" ? "w-full max-w-[390px]" : "w-full",
          )}
        >
          <HomepageLayoutRenderer
            layout={layout}
            products={products}
            editing={{ selectedId, onSelect }}
          />
        </div>
      </div>
      <div className="border border-[rgb(var(--vibe-border))] bg-white p-4 xl:max-h-[82vh] xl:overflow-y-auto">
        {selectedSection ? (
          <SectionEditor
            section={selectedSection}
            products={products}
            onChange={(next) => updateSection(selectedSection.id, () => next)}
          />
        ) : (
          <div className="grid min-h-48 place-items-center text-center text-sm text-[rgb(var(--vibe-muted))]">
            Choose a section in the preview.
          </div>
        )}
      </div>
    </div>
  );
}

function FormEditor({
  layout,
  products,
  openId,
  onOpen,
  updateSection,
  moveSection,
  draggedId,
  setDraggedId,
  moveSectionTo,
}: {
  layout: HomepageLayout;
  products: ReturnType<typeof storefrontProductFromSource>[];
  openId: string | null;
  onOpen: (id: string | null) => void;
  updateSection: (id: string, update: (section: HomepageSection) => HomepageSection) => void;
  moveSection: (id: string, direction: -1 | 1) => void;
  draggedId: string | null;
  setDraggedId: (id: string | null) => void;
  moveSectionTo: (id: string, targetId: string) => void;
}) {
  return (
    <div className="space-y-2">
      {layout.sections.map((section, index) => {
        const open = openId === section.id;
        const locked = section.type === "hero";
        return (
          <article
            key={section.id}
            draggable={!locked}
            onDragStart={() => setDraggedId(section.id)}
            onDragEnd={() => setDraggedId(null)}
            onDragOver={(event) => {
              if (!locked) event.preventDefault();
            }}
            onDrop={() => {
              if (draggedId) moveSectionTo(draggedId, section.id);
              setDraggedId(null);
            }}
            className={cn(
              "border bg-white",
              open ? "border-black" : "border-[rgb(var(--vibe-border))]",
              draggedId === section.id && "opacity-45",
            )}
          >
            <div className="flex items-center gap-2 p-3 sm:p-4">
              <GripVertical
                className={cn(
                  "h-4 w-4 shrink-0",
                  locked ? "opacity-20" : "cursor-grab text-zinc-500",
                )}
              />
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => onOpen(open ? null : section.id)}
              >
                <span className="block truncate text-sm font-medium">
                  {homepageSectionName(section)}
                </span>
                <span className="text-[11px] uppercase tracking-[0.12em] text-[rgb(var(--vibe-muted))]">
                  {section.type} · {section.visible ? "visible" : "hidden"}
                </span>
              </button>
              {!locked ? (
                <div className="hidden gap-1 sm:flex">
                  <IconButton
                    label="Move up"
                    disabled={index <= 1}
                    onClick={() => moveSection(section.id, -1)}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    label="Move down"
                    disabled={index === layout.sections.length - 1}
                    onClick={() => moveSection(section.id, 1)}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </IconButton>
                </div>
              ) : null}
              <button
                type="button"
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 border px-2.5 text-xs font-medium",
                  section.visible
                    ? "border-black bg-black text-white"
                    : "border-zinc-300 text-zinc-600",
                )}
                onClick={() =>
                  updateSection(section.id, (current) => ({
                    ...current,
                    visible: !current.visible,
                  }))
                }
              >
                {section.visible ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
                {section.visible ? "Shown" : "Hidden"}
              </button>
              <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
            </div>
            {open ? (
              <div className="border-t border-[rgb(var(--vibe-border))] p-4 sm:p-5">
                <SectionEditor
                  section={section}
                  products={products}
                  onChange={(next) => updateSection(section.id, () => next)}
                />
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function SectionEditor({
  section,
  products,
  onChange,
}: {
  section: HomepageSection;
  products: ReturnType<typeof storefrontProductFromSource>[];
  onChange: (section: HomepageSection) => void;
}) {
  const [cropDevice, setCropDevice] = useState<PreviewDevice>("mobile");
  const [uploading, setUploading] = useState<string | null>(null);

  const upload = async (file: File, target: "main" | "mobile" | "poster" | "video") => {
    setUploading(target);
    try {
      const url = await uploadProductImage(file);
      if (!url) throw new Error("Upload finished without a public media URL.");
      if (section.type === "video") {
        if (target === "poster")
          onChange({ ...section, poster: { ...section.poster, imageUrl: url } });
        else if (target === "mobile")
          onChange({ ...section, poster: { ...section.poster, mobileImageUrl: url } });
        else if (/\.webm(?:#|$)/i.test(url) || file.type === "video/webm")
          onChange({ ...section, videoWebmUrl: url });
        else onChange({ ...section, videoMp4Url: url });
      } else if (section.type === "scent" || section.type === "promo") {
        onChange({
          ...section,
          media:
            target === "mobile"
              ? { ...section.media, mobileImageUrl: url }
              : { ...section.media, imageUrl: url },
        });
      }
      toast.success(target === "video" ? "Film uploaded" : "Image uploaded");
    } catch (error) {
      toast.error("Upload failed", { description: message(error) });
    } finally {
      setUploading(null);
    }
  };

  const heading = (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold">{homepageSectionName(section)}</p>
        <p className="mt-1 text-xs text-[rgb(var(--vibe-muted))]">
          {section.type === "hero"
            ? "The first section is protected from reordering."
            : "Changes save privately as you work."}
        </p>
      </div>
      <button
        type="button"
        className={cn(
          "inline-flex h-8 items-center gap-1.5 border px-2.5 text-xs font-medium",
          section.visible ? "border-black bg-black text-white" : "border-zinc-300 text-zinc-600",
        )}
        onClick={() => onChange({ ...section, visible: !section.visible })}
      >
        {section.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        {section.visible ? "Shown" : "Hidden"}
      </button>
    </div>
  );

  if (section.type === "hero" || section.type === "collection") {
    return (
      <div>
        {heading}
        <div className="space-y-4">
          <TextField
            label="Eyebrow"
            value={section.eyebrow}
            onChange={(value) => onChange({ ...section, eyebrow: value })}
          />
          <TextField
            label="Headline"
            value={section.headline}
            onChange={(value) => onChange({ ...section, headline: value })}
          />
          <TextAreaField
            label="Supporting text"
            value={section.subtext}
            onChange={(value) => onChange({ ...section, subtext: value })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Button label"
              value={section.ctaLabel}
              onChange={(value) => onChange({ ...section, ctaLabel: value })}
            />
            <TextField
              label="Button link"
              value={section.ctaHref}
              onChange={(value) => onChange({ ...section, ctaHref: value })}
            />
          </div>
          <ProductSelector
            products={products}
            selectedIds={section.productIds}
            onChange={(productIds) => onChange({ ...section, productIds })}
            label={section.type === "hero" ? "Hero carousel products" : "Collection products"}
          />
        </div>
      </div>
    );
  }

  if (section.type === "video") {
    return (
      <div>
        {heading}
        <div className="space-y-4">
          <MediaButtons uploading={uploading} onUpload={upload} video />
          <CropControls
            media={section.poster}
            device={cropDevice}
            onDeviceChange={setCropDevice}
            fallbackImage={section.poster.imageUrl}
            onChange={(poster) => onChange({ ...section, poster })}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <SelectField
              label="Video focus"
              value={section.focalPosition}
              options={["top", "center", "bottom"]}
              onChange={(value) =>
                onChange({ ...section, focalPosition: value as typeof section.focalPosition })
              }
            />
            <SelectField
              label="Phone fit"
              value={section.mobileFit}
              options={["cover", "contain"]}
              onChange={(value) =>
                onChange({ ...section, mobileFit: value as typeof section.mobileFit })
              }
            />
            <SelectField
              label="Desktop fit"
              value={section.desktopFit}
              options={["contain", "cover"]}
              onChange={(value) =>
                onChange({ ...section, desktopFit: value as typeof section.desktopFit })
              }
            />
          </div>
          <details className="border border-[rgb(var(--vibe-border))]">
            <summary className="cursor-pointer p-3 text-xs font-medium">
              Advanced video URLs
            </summary>
            <div className="space-y-3 border-t border-[rgb(var(--vibe-border))] p-3">
              <TextField
                label="Poster URL"
                value={section.poster.imageUrl}
                onChange={(value) =>
                  onChange({ ...section, poster: { ...section.poster, imageUrl: value } })
                }
              />
              <TextField
                label="WebM URL"
                value={section.videoWebmUrl ?? ""}
                onChange={(value) => onChange({ ...section, videoWebmUrl: value || null })}
              />
              <TextField
                label="MP4 URL"
                value={section.videoMp4Url ?? ""}
                onChange={(value) => onChange({ ...section, videoMp4Url: value || null })}
              />
            </div>
          </details>
        </div>
      </div>
    );
  }

  const linkedProduct = section.type === "promo" ? section.productId : section.productId;
  const fallbackProduct = products.find((product) => product.id === linkedProduct);
  const fallbackImage =
    fallbackProduct?.socialImage || fallbackProduct?.gallery?.[1] || fallbackProduct?.image || "";

  return (
    <div>
      {heading}
      <div className="space-y-4">
        <MediaButtons uploading={uploading} onUpload={upload} />
        <CropControls
          media={section.media}
          device={cropDevice}
          onDeviceChange={setCropDevice}
          fallbackImage={fallbackImage}
          onChange={(media) => onChange({ ...section, media })}
        />
        {section.type === "promo" ? (
          <ProductLinkPicker
            products={products}
            value={section.productId}
            onChange={(productId) => onChange({ ...section, productId })}
          />
        ) : (
          <TextField
            label="Linked product"
            value={fallbackProduct?.name || section.productId}
            disabled
          />
        )}
        <TextField
          label="Eyebrow"
          value={section.eyebrow}
          onChange={(value) => onChange({ ...section, eyebrow: value })}
        />
        <TextField
          label="Headline override"
          value={section.headline}
          placeholder={fallbackProduct?.name || "Banner headline"}
          onChange={(value) => onChange({ ...section, headline: value })}
        />
        <TextAreaField
          label="Supporting text override"
          value={section.subtext}
          placeholder={fallbackProduct?.tag || "Optional supporting text"}
          onChange={(value) => onChange({ ...section, subtext: value })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Button label"
            value={section.ctaLabel}
            onChange={(value) => onChange({ ...section, ctaLabel: value })}
          />
          <TextField
            label="Button or custom link"
            value={section.ctaHref}
            onChange={(value) => onChange({ ...section, ctaHref: value })}
          />
        </div>
        <SelectField
          label="Text alignment"
          value={section.textAlign}
          options={["left", "center", "right"]}
          onChange={(value) =>
            onChange({ ...section, textAlign: value as typeof section.textAlign })
          }
        />
      </div>
    </div>
  );
}

function MediaButtons({
  uploading,
  onUpload,
  video = false,
}: {
  uploading: string | null;
  onUpload: (file: File, target: "main" | "mobile" | "poster" | "video") => Promise<void>;
  video?: boolean;
}) {
  return (
    <div className={cn("grid gap-2", video ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
      <FileButton
        accept="image/jpeg,image/png,image/webp,image/avif"
        disabled={uploading !== null}
        label={
          uploading === (video ? "poster" : "main")
            ? "Uploading…"
            : video
              ? "Replace poster"
              : "Replace image"
        }
        Icon={ImageIcon}
        onFile={(file) => void onUpload(file, video ? "poster" : "main")}
      />
      {video ? (
        <FileButton
          accept="image/jpeg,image/png,image/webp,image/avif"
          disabled={uploading !== null}
          label={uploading === "mobile" ? "Uploading…" : "Mobile poster"}
          Icon={Smartphone}
          onFile={(file) => void onUpload(file, "mobile")}
        />
      ) : null}
      <FileButton
        accept={video ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp,image/avif"}
        disabled={uploading !== null}
        label={
          uploading === (video ? "video" : "mobile")
            ? "Uploading…"
            : video
              ? "Replace film"
              : "Optional mobile image"
        }
        Icon={Upload}
        onFile={(file) => void onUpload(file, video ? "video" : "mobile")}
      />
    </div>
  );
}

function CropControls({
  media,
  device,
  onDeviceChange,
  fallbackImage,
  onChange,
}: {
  media: HomepageMedia;
  device: PreviewDevice;
  onDeviceChange: (device: PreviewDevice) => void;
  fallbackImage: string;
  onChange: (media: HomepageMedia) => void;
}) {
  const crop = device === "mobile" ? media.mobileCrop : media.desktopCrop;
  const image =
    device === "mobile"
      ? media.mobileImageUrl || media.imageUrl || fallbackImage
      : media.imageUrl || fallbackImage;
  const setCrop = (next: HomepageCrop) =>
    onChange({ ...media, [device === "mobile" ? "mobileCrop" : "desktopCrop"]: next });

  return (
    <div className="border border-[rgb(var(--vibe-border))] p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold">Crop and position</p>
          <p className="text-[11px] text-[rgb(var(--vibe-muted))]">
            Drag on the preview. Pinch on a phone to zoom.
          </p>
        </div>
        <div className="grid grid-cols-2 border border-[rgb(var(--vibe-border))] p-1">
          <ModeButton active={device === "mobile"} onClick={() => onDeviceChange("mobile")}>
            <Smartphone className="h-3.5 w-3.5" />
          </ModeButton>
          <ModeButton active={device === "desktop"} onClick={() => onDeviceChange("desktop")}>
            <Monitor className="h-3.5 w-3.5" />
          </ModeButton>
        </div>
      </div>
      <CropCanvas image={image} crop={crop} device={device} onChange={setCrop} />
      <div className="mt-4 space-y-3">
        <RangeField
          label="Left / right"
          value={crop.x}
          min={0}
          max={100}
          onChange={(x) => setCrop({ ...crop, x })}
        />
        <RangeField
          label="Up / down"
          value={crop.y}
          min={0}
          max={100}
          onChange={(y) => setCrop({ ...crop, y })}
        />
        <RangeField
          label="Zoom"
          value={crop.zoom}
          min={100}
          max={300}
          onChange={(zoom) => setCrop({ ...crop, zoom })}
          suffix="%"
        />
      </div>
      <button
        type="button"
        className="mt-3 inline-flex h-8 items-center gap-1.5 border border-[rgb(var(--vibe-border))] px-2.5 text-xs font-medium hover:bg-zinc-50"
        onClick={() => setCrop({ x: 50, y: 50, zoom: 100 })}
      >
        <RotateCcw className="h-3.5 w-3.5" /> Reset {device} crop
      </button>
    </div>
  );
}

function CropCanvas({
  image,
  crop,
  device,
  onChange,
}: {
  image: string;
  crop: HomepageCrop;
  device: PreviewDevice;
  onChange: (crop: HomepageCrop) => void;
}) {
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    x: number;
    y: number;
    zoom: number;
    startX: number;
    startY: number;
    distance: number;
  } | null>(null);

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const values = [...pointers.current.values()];
    const distance =
      values.length > 1 ? Math.hypot(values[1].x - values[0].x, values[1].y - values[0].y) : 0;
    gesture.current = {
      x: crop.x,
      y: crop.y,
      zoom: crop.zoom,
      startX: event.clientX,
      startY: event.clientY,
      distance,
    };
  };

  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId) || !gesture.current) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const values = [...pointers.current.values()];
    if (values.length > 1 && gesture.current.distance > 0) {
      const distance = Math.hypot(values[1].x - values[0].x, values[1].y - values[0].y);
      onChange({
        ...crop,
        zoom: Math.round(
          Math.min(
            300,
            Math.max(100, gesture.current.zoom * (distance / gesture.current.distance)),
          ),
        ),
      });
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    onChange({
      ...crop,
      x: Math.round(
        Math.min(
          100,
          Math.max(
            0,
            gesture.current.x - ((event.clientX - gesture.current.startX) / bounds.width) * 100,
          ),
        ),
      ),
      y: Math.round(
        Math.min(
          100,
          Math.max(
            0,
            gesture.current.y - ((event.clientY - gesture.current.startY) / bounds.height) * 100,
          ),
        ),
      ),
    });
  };

  const pointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (!pointers.current.size) gesture.current = null;
  };

  const style = {
    objectPosition: `${crop.x}% ${crop.y}%`,
    transform: `scale(${crop.zoom / 100})`,
    transformOrigin: `${crop.x}% ${crop.y}%`,
  };
  return (
    <div
      className={cn(
        "relative mx-auto touch-none select-none overflow-hidden bg-zinc-950",
        device === "mobile" ? "aspect-[4/5] max-w-[280px]" : "aspect-[16/10] w-full",
      )}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
      aria-label="Drag or pinch to position this image"
    >
      {image ? (
        <img
          src={image}
          alt="Crop preview"
          draggable={false}
          className="pointer-events-none h-full w-full object-cover"
          style={style}
        />
      ) : (
        <div className="grid h-full place-items-center p-6 text-center text-xs text-white/60">
          Upload an image to start positioning it.
        </div>
      )}
      <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-white">
        Drag · pinch to zoom
      </span>
    </div>
  );
}

function ProductSelector({
  products,
  selectedIds,
  onChange,
  label,
}: {
  products: ReturnType<typeof storefrontProductFromSource>[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label: string;
}) {
  const selected = selectedIds.flatMap((id) => {
    const product = products.find((item) => item.id === id);
    return product ? [product] : [];
  });
  return (
    <div className="border border-[rgb(var(--vibe-border))] p-3">
      <p className="text-xs font-semibold">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {products.map((product) => {
          const active = selectedIds.includes(product.id);
          return (
            <button
              key={product.id}
              type="button"
              disabled={active && selectedIds.length === 1}
              className={cn(
                "border px-3 py-2 text-xs font-medium",
                active ? "border-black bg-black text-white" : "border-zinc-300 hover:bg-zinc-50",
                active && selectedIds.length === 1 && "cursor-not-allowed opacity-60",
              )}
              aria-pressed={active}
              onClick={() =>
                onChange(
                  active
                    ? selectedIds.filter((id) => id !== product.id)
                    : [...selectedIds, product.id],
                )
              }
            >
              {product.name}
            </button>
          );
        })}
      </div>
      <div className="mt-3 space-y-1">
        {selected.map((product, index) => (
          <div key={product.id} className="flex items-center gap-2 bg-zinc-50 px-2 py-1.5 text-xs">
            <span className="w-5 text-zinc-400">{index + 1}</span>
            <span className="min-w-0 flex-1 truncate font-medium">{product.name}</span>
            <IconButton
              label="Move product left"
              disabled={index === 0}
              onClick={() => onChange(moveItem(selectedIds, index, index - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton
              label="Move product right"
              disabled={index === selected.length - 1}
              onClick={() => onChange(moveItem(selectedIds, index, index + 1))}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductLinkPicker({
  products,
  value,
  onChange,
}: {
  products: ReturnType<typeof storefrontProductFromSource>[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[rgb(var(--vibe-muted))]">
        Optional linked product
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(
            "border px-3 py-2 text-xs",
            value === null ? "border-black bg-black text-white" : "border-zinc-300",
          )}
          onClick={() => onChange(null)}
        >
          Custom banner
        </button>
        {products.map((product) => (
          <button
            key={product.id}
            type="button"
            className={cn(
              "border px-3 py-2 text-xs",
              value === product.id ? "border-black bg-black text-white" : "border-zinc-300",
            )}
            onClick={() => onChange(product.id)}
          >
            {product.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function moveItem(items: string[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-[rgb(var(--vibe-muted))]">
        {label}
      </span>
      <input
        className="admin-input"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-[rgb(var(--vibe-muted))]">
        {label}
      </span>
      <textarea
        className="admin-input min-h-20 resize-y"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-[rgb(var(--vibe-muted))]">
        {label}
      </span>
      <select
        className="admin-input capitalize"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  suffix = "%",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[11px] font-medium text-[rgb(var(--vibe-muted))]">
        <span>{label}</span>
        <output className="font-mono text-black">
          {Math.round(value)}
          {suffix}
        </output>
      </span>
      <input
        className="h-7 w-full cursor-ew-resize accent-black"
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function FileButton({
  accept,
  disabled,
  label,
  Icon,
  onFile,
}: {
  accept: string;
  disabled: boolean;
  label: string;
  Icon: typeof ImageIcon;
  onFile: (file: File) => void;
}) {
  return (
    <label
      className={cn(
        "admin-button admin-button-secondary cursor-pointer justify-center",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <Icon className="h-4 w-4" /> {label}
      <input
        className="sr-only"
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
    </label>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center border border-[rgb(var(--vibe-border))] hover:bg-zinc-100 disabled:opacity-25"
    >
      {children}
    </button>
  );
}

function ConfirmDialog({
  action,
  busy,
  publishSummary,
  onSummaryChange,
  onCancel,
  onConfirm,
}: {
  action: Exclude<ConfirmAction, null>;
  busy: boolean;
  publishSummary: string;
  onSummaryChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const title =
    action.type === "publish"
      ? "Publish this homepage?"
      : action.type === "discard"
        ? "Discard all draft changes?"
        : `Restore version ${action.version}?`;
  const description =
    action.type === "publish"
      ? "The private draft will become visible to every visitor. The current live homepage will remain available in version history."
      : action.type === "discard"
        ? "The draft will return to the current live homepage. This does not change what visitors see."
        : "The selected version will immediately become both the live homepage and the new draft.";
  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="homepage-confirm-title"
    >
      <div className="w-full max-w-md bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id="homepage-confirm-title" className="text-lg font-semibold">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
          </div>
          <button type="button" aria-label="Close" onClick={onCancel} disabled={busy}>
            <X className="h-5 w-5" />
          </button>
        </div>
        {action.type === "publish" ? (
          <div className="mt-4">
            <TextField
              label="Optional version note"
              value={publishSummary}
              placeholder="What changed?"
              onChange={onSummaryChange}
            />
          </div>
        ) : null}
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="admin-button admin-button-secondary justify-center"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="admin-button justify-center"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy
              ? "Working…"
              : action.type === "publish"
                ? "Publish now"
                : action.type === "discard"
                  ? "Discard draft"
                  : "Restore version"}
          </button>
        </div>
      </div>
    </div>
  );
}
