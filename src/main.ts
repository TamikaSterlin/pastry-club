import {
  Purchases,
  PurchasesError,
  ErrorCode,
  type Package,
  type CustomerInfo,
} from "@revenuecat/purchases-js";
import "./style.css";

const ENTITLEMENT_ID = "pastry_club";
const statusEl = document.querySelector<HTMLParagraphElement>("#status")!;
const plansEl = document.querySelector<HTMLElement>("#plans")!;
const perksEl = document.querySelector<HTMLElement>("#perks")!;

// Keep the same anonymous user across page reloads
function getAppUserId(): string {
  const saved = localStorage.getItem("rc_app_user_id");
  if (saved) return saved;
  const id = Purchases.generateRevenueCatAnonymousAppUserId();
  localStorage.setItem("rc_app_user_id", id);
  return id;
}

const purchases = Purchases.configure({
  apiKey: import.meta.env.VITE_RC_API_KEY,
  appUserId: getAppUserId(),
});

function hasAccess(info: CustomerInfo): boolean {
  return ENTITLEMENT_ID in info.entitlements.active;
}

function showMember() {
  statusEl.textContent = "You're a Pastry Club member.";
  plansEl.hidden = true;
  perksEl.hidden = false;
}

// Price display: confirm the field name in Step 6
function priceLabel(pkg: Package): string {
  const product: any = pkg.webBillingProduct ?? (pkg as any).rcBillingProduct;
  return (
    product?.currentPrice?.formattedPrice ??
    product?.price?.formattedPrice ??
    ""
  );
}

function renderPlans(packages: Package[]) {
  plansEl.innerHTML = "";
  for (const pkg of packages) {
    const card = document.createElement("div");
    card.className = "plan";
    const product: any = pkg.webBillingProduct ?? (pkg as any).rcBillingProduct;
    card.innerHTML = `
      <h3>${product?.title ?? pkg.identifier}</h3>
      <p class="price">${priceLabel(pkg)}</p>
      <button>Join the club</button>`;
    card.querySelector("button")!.addEventListener("click", () => buy(pkg));
    plansEl.appendChild(card);
  }
}

async function buy(pkg: Package) {
  try {
    const { customerInfo } = await purchases.purchase({ rcPackage: pkg });
    if (hasAccess(customerInfo)) showMember();
  } catch (e) {
    if (
      e instanceof PurchasesError &&
      e.errorCode === ErrorCode.UserCancelledError
    ) {
      return; // user closed checkout, nothing to do
    }
    console.error(e);
    statusEl.textContent =
      "Something went wrong with checkout. Please try again.";
  }
}

async function init() {
  try {
    const info = await purchases.getCustomerInfo();
    if (hasAccess(info)) return showMember();

    const offerings = await purchases.getOfferings();
    const current = offerings.current;
    if (!current || current.availablePackages.length === 0) {
      statusEl.textContent =
        "No plans available. Check your current offering in RevenueCat.";
      return;
    }
    console.log("Packages:", current.availablePackages); // used in Step 6
    statusEl.textContent = "Choose your plan:";
    renderPlans(current.availablePackages);
  } catch (e) {
    console.error(e);
    statusEl.textContent =
      "Couldn't load plans. Check your API key and offering setup.";
  }
}

init();
