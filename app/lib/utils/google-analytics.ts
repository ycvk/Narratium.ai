export const GA_MEASUREMENT_ID = "G-KDEPSL9CJG";

export const initGA = () => {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") return;

  if ((window as any).dataLayer) return;

  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).gtag = function() {
    (window as any).dataLayer.push(arguments);
  };

  (window as any).gtag("js", new Date());
  
  (window as any).gtag("config", GA_MEASUREMENT_ID, {
    page_path: window.location.pathname,
    anonymize_ip: true,
  });
};

export const pageview = (url: string) => {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") return;
  (window as any).gtag("config", GA_MEASUREMENT_ID, {
    page_path: url,
  });
};

export const event = ({ action, category, label, value }: {
  action: string;
  category: string;
  label?: string;
  value?: number;
}) => {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") return;
  (window as any).gtag("event", action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

export const trackButtonClick = (buttonId: string, buttonName: string) => {
  event({
    action: "button_click",
    category: buttonId,
    label: buttonName,
  });
};

export const trackFormSubmit = (formId: string, formName: string) => {
  event({
    action: "form_submit",
    category: formId,
    label: formName,
  });
};

export const trackTimeSpent = (pageName: string, timeInSeconds: number) => {
  event({
    action: "time_spent",
    category: pageName,
    label: pageName,
    value: timeInSeconds,
  });
};
