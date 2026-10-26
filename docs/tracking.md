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

## Identifying users

```js
window.openAnalytics.identify("user-123", { name: "Alice" });
```

Call `identify` after sign-in so the visit can be analyzed with that user's other visits. On sign-out or before switching accounts, call `reset()` to start a new anonymous visitor.
