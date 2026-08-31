import { api } from "../../convex/_generated/api";
import { convex } from "@/integrations/convex/client";
import type { HomepageEditorState, HomepageLayout } from "@/lib/homepageLayout";
import { notifySearchEngines } from "./indexNowService";

export async function getHomepageEditorState(): Promise<HomepageEditorState | null> {
  return (await convex.query(api.homepageLayout.getEditorState, {})) as HomepageEditorState | null;
}

export async function initializeHomepageEditor(): Promise<HomepageEditorState> {
  return (await convex.mutation(api.homepageLayout.initialize, {})) as HomepageEditorState;
}

export async function saveHomepageDraft(
  layout: HomepageLayout,
  expectedVersion: number,
): Promise<HomepageEditorState> {
  return (await convex.mutation(api.homepageLayout.saveDraft, {
    layout,
    expectedVersion,
  })) as HomepageEditorState;
}

export async function publishHomepageDraft(
  expectedVersion: number,
  summary?: string,
): Promise<HomepageEditorState> {
  const result = (await convex.mutation(api.homepageLayout.publishDraft, {
    expectedVersion,
    summary,
  })) as HomepageEditorState;
  await notifySearchEngines(["/"]);
  return result;
}

export async function discardHomepageDraft(expectedVersion: number): Promise<HomepageEditorState> {
  return (await convex.mutation(api.homepageLayout.discardDraft, {
    expectedVersion,
  })) as HomepageEditorState;
}

export async function restoreHomepageRevision(
  revisionId: string,
  expectedVersion: number,
): Promise<HomepageEditorState> {
  return (await convex.mutation(api.homepageLayout.restoreRevision, {
    revisionId: revisionId as never,
    expectedVersion,
  })) as HomepageEditorState;
}
