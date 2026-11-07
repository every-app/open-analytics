# Tracking

Add the snippet from a site's **Settings** page:

```html
<script defer src="https://analytics.example.com/script.js?siteId=YOUR_SITE_ID"></script>
```

## Custom events

```js
window.openAnalytics.track("signup_click", { plan: "pro", source: "pricing" });
```

- `track(eventName, eventData?)`: report a custom event.
- `trackOnce(eventName, eventData?)`: report an event name at most once per page.
- `setGlobalProperties(props)` / `clearGlobalProperties()`: add or clear properties on later events.

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

## What counts

- A pageview is a new path. A change to the query string alone is the same page, and so is a new `#hash` unless hash tracking is on in the site's Settings. `history.replaceState` is never a pageview.
- A visit takes its source from its first page: the referrer and the `utm_*` tags. UTM tags are recorded even when query-string tracking is off.
- Nothing is stored in the browser. Visitors are counted with a hash of the IP address, user agent and a salt that changes every day, so the same person on two days counts twice.
- Only the site's domain and its subdomains are counted. Pages on `localhost`, `127.0.0.1` or `file://` send nothing. To count another domain, add it as an allowed domain (`-other.example`) in the site's blocking rules.
