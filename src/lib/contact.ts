/** お問い合わせの種類。messages の contact.category.* と対応する */
export const CONTACT_CATEGORIES = ["listing", "correction", "other"] as const;
export type ContactCategory = (typeof CONTACT_CATEGORIES)[number];

export interface ContactRow {
  id: string;
  category: ContactCategory;
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt: string;
}
