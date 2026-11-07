# Tracking

Add the snippet from a site's **Settings** page:

```html
<script defer src="https://analytics.example.com/script.js?siteId=YOUR_SITE_ID"></script>
```

## Custom events

```js
window.openAnalytics.track("signup_click", { plan: "pro", source: "pricing" });
```

- `track(eventName, eventData?, options?)`: report a custom event. `options.revenue` adds [revenue](#revenue).
- `trackOnce(eventName, eventData?, options?)`: report an event name at most once per page.
- `setGlobalProperties(props)` / `clearGlobalProperties()`: add or clear properties on later events and page views.

Or declare them in HTML:

```html
<!-- Click trigger -->
<button data-open-analytics-event="signup_click">Sign up</button>

<!-- Extra fields, one attribute each or as JSON -->
<button
  data-open-analytics-event="signup_click"
  data-open-analytics-event-plan="pro"
  data-open-analytics-event-data='{"source":"pricing"}'
>
  Sign up
</button>

<!-- Form submit trigger -->
<form data-open-analytics-event="contact_submit" data-open-analytics-event-trigger="submit">…</form>
```

## Automatic events

Each of these is off until you turn it on in the site's **Settings** page. Each reports a custom event, so you can make a goal from it.

- **Outbound links:** clicking a link to another domain reports `outbound_click` with its `url` and `domain`.
- **File downloads:** clicking a link to a file reports `file_download` with its `url`, without the query string. That covers PDF, ZIP, CSV, Office documents, audio, video, installers and archives, and any link with a `download` attribute.
- **404 pages:** a page served with a 404 status reports `page_not_found` with its `path`. Browsers that don't report a page's status (Safari), and single-page apps that render their own not-found page, can send it themselves:

  ```js
  window.openAnalytics.track("page_not_found", { path: location.pathname });
  ```

## Revenue

```js
window.openAnalytics.track("Purchase", { plan: "pro" }, { revenue: { amount: 15.99, currency: "USD" } });
```

`amount` is a number or a decimal string such as `"15.99"`, and `currency` an ISO 4217 code in any case. If either is invalid, the event is still counted, without its revenue.

Give a goal on that event (`event.name eq "Purchase"`) a revenue currency, and the dashboard shows its total revenue and its average revenue: the total divided by the goal's events that carried revenue in that currency. A goal with a currency must match custom events only, not page views.

Currencies are never converted. A goal adds up only the events tracked in its own currency; events in other currencies don't count toward its revenue.

## Page view properties

Give page views custom properties, such as the author or type of a page, to break the dashboard down by them. Set them on the script tag with a `data-prop-<key>` attribute each, and they go with every page view:

```html
<script
  defer
  src="https://analytics.example.com/script.js?siteId=YOUR_SITE_ID"
  data-prop-author="Jane Doe"
  data-prop-page-type="article"
></script>
```

Or set them from JavaScript. They go with every later page view, as well as with later events:

```js
window.openAnalytics.setGlobalProperties({ plan: "pro", logged_in: true });
```

- Properties are flat key and value pairs. Numbers and booleans are sent as strings, and objects, arrays and `null` are left out of page views.
- A `setGlobalProperties` key replaces a script tag attribute with the same key. `clearGlobalProperties()` removes them; the script tag's stay.
- A page view keeps at most 30 properties. A key over 64 characters is dropped, and a value is cut to 255.
- The **Properties** card, beside the goal conversions (not on share pages), lists one key's values with their visitors, page views and events, picked from the keys seen in the period. Events' top-level string properties count in it too. Click a value to filter the dashboard by it: the filter matches page views with that property and events with it in their payload. In a filter expression, it is `event.payload("/author") eq "Jane Doe"`.

## What counts

- A pageview is a new path. A change to the query string alone is the same page, and so is a new `#hash` unless hash tracking is on in the site's Settings. `history.replaceState` is never a pageview.
- A visit takes its source from its first page: the referrer and the `utm_*` tags. UTM tags are recorded even when query-string tracking is off.
- Nothing is stored in the browser. Visitors are counted with a hash of the IP address, user agent, site and a random salt. Each site gets a new salt every UTC day, and the old one is deleted shortly after its day ends, so a visitor ID can't be recomputed afterward or matched across sites. The same person on two days counts twice.
- No IP address or raw user agent is stored. A page view keeps the browser, operating system and device read from the user agent, and its location as country, region, city and coordinates rounded to about 11 km.
- Visit duration counts only the time the page is visible. Time in a background tab is left out.
- Scroll depth is how far down a page the visitor scrolled: the bottom of the deepest view as a percent of the page's height, from 0 to 100. A page too short to scroll counts as 100. As in Plausible, a page's scroll depth is each visitor's deepest scroll on it, averaged over the visitors. The Top pages card's **Details** shows and sorts by each page's, and filtering by a page shows a **Scroll depth** top stat, in place of views per visit, that you can graph.
- Only the site's domain and its subdomains are counted. Pages on `localhost`, `127.0.0.1` or `file://` send nothing. To count another domain, add it as an allowed domain (`-other.example`) in the site's blocking rules.

## Scroll depth goals

A scroll depth goal counts visitors who scrolled at least a given percent down a page. In the goal editor, pick the **Scroll depth** trigger and fill in:

- **Scroll depth threshold**: a whole number from 1 to 100.
- **Page path**: `*` matches any characters, slashes included, and the rest matches exactly. `/blog*` is every page under `/blog`, `/checkout/order-received/*` every order confirmation, and `/products/*/reviews` each product's reviews. A path can have one `*`, or one at each end (`*docs*`). Leave it empty to count every page.

Leave the name empty to call the goal "Scroll 75% on /blog*", or "Scroll 75%" for every page. Agents create one with the `save_goal` tool's `scroll_depth` and `page_path`.

The goal is saved as a filter, which the **Filter** trigger shows and edits like any other:

```
page.path eq "/pricing" AND page.scrollDepth gte 75
```

Both conditions apply to the same page view, so a visitor counts only when they scrolled 75% of `/pricing` itself. A goal whose filter has this shape, a page path condition and `page.scrollDepth gte` a threshold or the threshold alone, opens with the **Scroll depth** trigger.

As in Plausible, a scroll depth goal shows its uniques and conversion rate but not its total: the Goal conversions card shows "—" for Total, and the goal's page "—" for its sessions and their conversion rate.
