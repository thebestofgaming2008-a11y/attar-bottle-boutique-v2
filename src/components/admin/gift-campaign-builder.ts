import type { GiftCampaign, GiftCampaignInput, GiftRequirement } from "@/services/adminService";

export type GiftCampaignDraft = GiftCampaignInput & {
  id?: string;
  archived_at?: string | null;
};

export type GiftCampaignReadiness = {
  errors: string[];
  warnings: string[];
};

export function slugifyGiftValue(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function blankGiftRequirement(): GiftRequirement {
  return {
    label: "",
    scope_type: "collection",
    collection_slugs: [],
    category_ids: [],
    product_ids: [],
    required_quantity: 1,
  };
}

export function blankGiftCampaign(sortOrder: number): GiftCampaignDraft {
  return {
    name: "",
    active: false,
    match_mode: "all",
    requirements: [blankGiftRequirement()],
    gift_product_id: "",
    reward_mode: "fixed",
    reward_scope: "all",
    reward_product_ids: [],
    gift_quantity: 1,
    gift_color: null,
    gift_size: null,
    starts_at: null,
    ends_at: null,
    sort_order: sortOrder,
    priority: Math.max(1, 100 - sortOrder),
    combines_with_other_gifts: false,
    repeatable: false,
    max_awards_per_order: 1,
    allow_discount_codes: true,
    archived_at: null,
  };
}

export function giftCampaignDraft(campaign: GiftCampaign): GiftCampaignDraft {
  return {
    id: campaign.id,
    name: campaign.name,
    active: campaign.active,
    match_mode: campaign.match_mode,
    requirements: campaign.requirements,
    gift_product_id: campaign.gift_product_id,
    reward_mode: campaign.reward_mode ?? "fixed",
    reward_scope: campaign.reward_scope ?? "all",
    reward_product_ids: campaign.reward_product_ids ?? [],
    gift_quantity: campaign.gift_quantity,
    gift_color: campaign.gift_color,
    gift_size: campaign.gift_size,
    starts_at: campaign.starts_at,
    ends_at: campaign.ends_at,
    sort_order: campaign.sort_order,
    priority: campaign.priority,
    combines_with_other_gifts: campaign.combines_with_other_gifts,
    repeatable: campaign.repeatable,
    max_awards_per_order: campaign.max_awards_per_order,
    allow_discount_codes: campaign.allow_discount_codes,
    archived_at: campaign.archived_at,
  };
}

export function giftCampaignStatus(campaign: {
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  archived_at?: string | null;
}) {
  const now = Date.now();
  if (campaign.archived_at) return "Archived";
  if (!campaign.active) return "Draft";
  if (campaign.starts_at && Date.parse(campaign.starts_at) > now) return "Scheduled";
  if (campaign.ends_at && Date.parse(campaign.ends_at) <= now) return "Ended";
  return "Live";
}

function requirementPhrase(requirement: GiftRequirement) {
  if (requirement.scope_type === "all")
    return `buy any ${requirement.required_quantity} items across the store (mix and match)`;
  if (requirement.scope_type === "subtotal") {
    return `spend ${new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(requirement.required_quantity)}`;
  }

  const itemWord = requirement.required_quantity === 1 ? "item" : "items";
  const fallback =
    requirement.scope_type === "collection" ? "the selected collection" : "selected products";
  return `buy ${requirement.required_quantity} ${itemWord} from ${requirement.label || fallback}`;
}

export function giftCampaignSummary(draft: GiftCampaignDraft, giftName = "the selected gift") {
  const joiner = draft.match_mode === "all" ? " and " : " or ";
  const conditions = draft.requirements.map(requirementPhrase).join(joiner);
  const giftWord =
    draft.reward_mode === "choice"
      ? `${draft.gift_quantity} items of the customer's choice from ${draft.reward_scope === "all" ? "all store products" : "the selected reward products"}`
      : draft.gift_quantity === 1
        ? giftName
        : `${draft.gift_quantity} x ${giftName}`;
  const repeat = draft.repeatable
    ? ` This can repeat up to ${draft.max_awards_per_order} times in one order.`
    : " The gift is awarded once per order.";
  const sentence = `${conditions || "complete the qualifying purchase"} and receive ${giftWord} free.`;
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}${repeat}`;
}

export function validateGiftCampaign(
  draft: GiftCampaignDraft,
  giftStock: number | null,
): GiftCampaignReadiness {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!draft.name.trim()) errors.push("Give the offer an internal name.");
  if (!draft.requirements.length) errors.push("Add at least one qualifying purchase.");
  draft.requirements.forEach((requirement, index) => {
    const prefix = draft.requirements.length > 1 ? `Condition ${index + 1}: ` : "";
    const conditionError = (message: string) =>
      `${prefix}${prefix ? message : `${message.charAt(0).toUpperCase()}${message.slice(1)}`}`;
    const maximum = requirement.scope_type === "subtotal" ? 10000000 : 99;
    if (
      !Number.isInteger(requirement.required_quantity) ||
      requirement.required_quantity < 1 ||
      requirement.required_quantity > maximum
    ) {
      errors.push(conditionError(`enter a whole number between 1 and ${maximum}.`));
    }
    if (requirement.scope_type === "collection" && !requirement.collection_slugs.length) {
      errors.push(conditionError("choose a collection."));
    }
    if (requirement.scope_type === "products" && !requirement.product_ids.length) {
      errors.push(conditionError("choose at least one product."));
    }
  });
  if (draft.reward_mode === "choice") {
    if (draft.reward_scope !== "all" && !draft.reward_product_ids?.length)
      errors.push("Select the products customers may choose as gifts.");
  } else if (!draft.gift_product_id) errors.push("Choose the free gift product.");
  if (
    !Number.isInteger(draft.gift_quantity) ||
    draft.gift_quantity < 1 ||
    draft.gift_quantity > 10
  ) {
    errors.push("Gift quantity must be a whole number between 1 and 10.");
  }
  if (
    !Number.isInteger(draft.max_awards_per_order) ||
    draft.max_awards_per_order < 1 ||
    draft.max_awards_per_order > 10
  )
    errors.push("Maximum repeats must be a whole number between 1 and 10.");

  const start = draft.starts_at ? Date.parse(draft.starts_at) : null;
  const end = draft.ends_at ? Date.parse(draft.ends_at) : null;
  if (start !== null && Number.isNaN(start)) errors.push("Choose a valid start date.");
  if (end !== null && Number.isNaN(end)) errors.push("Choose a valid end date.");
  if (
    start !== null &&
    end !== null &&
    !Number.isNaN(start) &&
    !Number.isNaN(end) &&
    end <= start
  ) {
    errors.push("The end date must be after the start date.");
  }
  if (
    start !== null &&
    end !== null &&
    !Number.isNaN(start) &&
    !Number.isNaN(end) &&
    end > start &&
    end - start < 5 * 60_000
  ) {
    warnings.push(
      "This offer runs for less than five minutes. Check that the short window is intentional.",
    );
  }
  if (draft.active && end !== null && !Number.isNaN(end) && end <= Date.now()) {
    errors.push("Choose a future end date before making this offer live.");
  }

  if (draft.reward_mode !== "choice" && draft.gift_product_id && giftStock !== null) {
    if (draft.active && giftStock < draft.gift_quantity) {
      errors.push("Add gift stock before making this offer live.");
    } else if (giftStock < draft.gift_quantity) {
      warnings.push("The selected gift does not currently have enough stock to be awarded.");
    }
    const maximumPerOrder =
      draft.gift_quantity * (draft.repeatable ? draft.max_awards_per_order : 1);
    if (giftStock >= draft.gift_quantity && giftStock < maximumPerOrder) {
      warnings.push("Stock is below the maximum this offer could give to one customer.");
    }
  }

  if (draft.active && draft.starts_at && start !== null && start > Date.now()) {
    warnings.push("This offer is active but will stay hidden until its scheduled start time.");
  }

  return { errors, warnings };
}

export function giftCampaignSignature(draft: GiftCampaignDraft | null) {
  return draft ? JSON.stringify(draft) : "";
}
