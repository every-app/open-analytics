// @generated from src/i18n/en.yaml by scripts/i18n-check.
import type { Locale } from "./config";

export interface AppMessages {
  appName: string;
  navigation: {
    overview: string;
    realtime: string;
    pages: string;
    funnels: string;
    visitors: string;
    settings: string;
  };
  common: {
    deviceLabels: {
      desktop: string;
      mobile: string;
      tablet: string;
    };
    id: string;
    views: string;
    sessions: string;
    visitors: string;
    bounceRate: string;
    avgDuration: string;
    path: string;
    title: string;
    hostname: string;
    referrerHost: string;
    referrer: string;
    browser: string;
    operatingSystem: string;
    deviceType: string;
    country: string;
    region: string;
    regionCode: string;
    city: string;
    continent: string;
    latitude: string;
    longitude: string;
    continentLabels: Record<string, string>;
    timezone: string;
    screenSize: string;
    loading: string;
    noData: string;
    loadFailed: string;
    retry: string;
    filteredEmpty: string;
    clearFilters: string;
    unknown: string;
    system: string;
    theme: string;
    language: string;
    search: string;
    open: string;
    sortBy: string;
    change: string;
    new: string;
    tableExport: {
      action: string;
      title: string;
      description: string;
      scopeLabel: string;
      currentTab: string;
      allTabs: string;
      fileNameLabel: string;
      download: string;
      empty: string;
    };
    sitesFiltered: string;
    cumulativeTraffic: string;
  };
  ranges: {
    today: string;
    yesterday: string;
    last24h: string;
    last7d: string;
    last30d: string;
    last90d: string;
    monthToDate: string;
    lastMonth: string;
    yearToDate: string;
    last12m: string;
    allTime: string;
    custom: string;
  };
  intervals: {
    minute: string;
    hour: string;
    day: string;
    week: string;
    month: string;
  };
  dashboardHeader: {
    interval: string;
    compareButton: string;
    compareTitle: string;
    compareTimeLabel: string;
    compareCurrentPeriod: string;
    comparePreviousPeriod: string;
    compareYearOverYear: string;
    compareFilterLabel: string;
    compareFollowCurrentFilter: string;
    compareCustomFilter: string;
    compareApply: string;
    compareCancel: string;
    filterButton: string;
    filterButtonEvent: string;
    filterButtonSession: string;
    filterButtonVisitor: string;
    customHint: string;
    customPendingEnd: string;
    customApply: string;
    filterTitle: string;
    previousPeriod: string;
    yearAgo: string;
    nextPeriod: string;
    customSelectionSummary: string;
  };
  filters: {
    clear: string;
  };
  filterPills: {
    label: string;
    is: string;
    isNot: string;
    valueSeparator: string;
    remove: string;
  };
  conditionDescription: {
    and: string;
    or: string;
    not: string;
    emptyFilter: string;
    filterEquals: string;
    filterNotEquals: string;
    filterAnyOf: string;
    filterNoneOf: string;
    filterBetween: string;
    filterContains: string;
    filterStartsWith: string;
    filterEndsWith: string;
    filterGreaterThan: string;
    filterGreaterThanOrEqual: string;
    filterLessThan: string;
    filterLessThanOrEqual: string;
    filterExists: string;
    filterNotExists: string;
    filterIsNull: string;
    filterNotNull: string;
    filterIsEmpty: string;
    filterNotEmpty: string;
  };
  filterBuilder: {
    fieldGroups: {
      advanced: string;
      page: string;
      session: string;
      visitor: string;
      referrer: string;
      campaign: string;
      client: string;
      geography: string;
      event: string;
      acquisition: string;
      device: string;
      geo: string;
      performance: string;
      user: string;
      time: string;
      aggregation: string;
      calculation: string;
      relation: string;
    };
    fieldLabels: Record<string, string>;
    operatorLabels: Record<string, string>;
    valueType: string;
    valueKinds: {
      string: string;
      enum: string;
      number: string;
      boolean: string;
      date: string;
      datetime: string;
      "json-scalar": string;
    };
    booleanTrue: string;
    booleanFalse: string;
    valueUnset: string;
    valueLoading: string;
    valueSearchPlaceholder: string;
    valueListPlaceholder: string;
    valueShowMore: string;
    removeValue: string;
    rangeStartPlaceholder: string;
    rangeEndPlaceholder: string;
    unitAriaLabel: string;
    durationUnit: string;
    units: {
      hours: string;
      minutes: string;
      seconds: string;
      milliseconds: string;
      percent: string;
      perMille: string;
      pixels: string;
    };
    jsonPointer: string;
    jsonPointerPlaceholder: string;
    match: string;
    expression: string;
    expressionPlaceholder: string;
    naturalLanguageDescription: string;
    expressionInvalid: string;
    expressionHelpTitle: string;
    expressionHelpDescription: string;
    expressionHelpSyntax: string;
    expressionHelpLogicDescription: string;
    expressionHelpValues: string;
    expressionHelpValuesDescription: string;
    expressionHelpOperators: string;
    expressionHelpUnaryOperators: string;
    expressionHelpFields: string;
    expressionHelpFieldType: string;
    expressionHelpFieldOperators: string;
    expressionHelpOtherFields: string;
    expressionHelpContextTitle: string;
    expressionHelpContextDescription: string;
    expressionHelpContextExamples: string;
    advancedEditor: {
      not: string;
      removeNot: string;
      matchAll: string;
      matchAny: string;
      addCondition: string;
      addGroup: string;
      wrapInNot: string;
      remove: string;
      condition: string;
      literalValue: string;
      compareWithExpression: string;
      valuesAsJson: string;
      scalarArrayHelp: string;
      chooseValue: string;
      filterValue: string;
      durationAmount: string;
      jsonPointer: string;
      jsonPointerPlaceholder: string;
      entityMember: string;
      nthIndex: string;
      fromStep: string;
      toStep: string;
      occurrenceKind: string;
      occurrenceEntity: string;
      occurrenceIndex: string;
      correlationTarget: string;
      periodItemCount: string;
      nestedTooDeep: string;
      applyOffset: string;
      removeStep: string;
      addStep: string;
      excludedActivity: string;
      fixedTime: string;
      toggleOffsetSign: string;
      timeUnits: {
        milliseconds: string;
        seconds: string;
        minutes: string;
        hours: string;
        days: string;
        weeks: string;
        months: string;
        years: string;
      };
      coreRelation: string;
      coreRelationExpression: string;
      structuredEditor: string;
      unavailableForObservation: string;
      targetKinds: {
        time: string;
        field: string;
        "event-payload": string;
        "entity-root": string;
        "context-root": string;
        "context-intrinsic": string;
        "occurrence-time": string;
        member: string;
        selector: string;
        projection: string;
        reducer: string;
        arithmetic: string;
        duration: string;
        "time-anchor": string;
        "sequence-span": string;
        "sequence-gap": string;
        "sequence-same": string;
        "period-items": string;
        bucket: string;
        window: string;
        periods: string;
        sequence: string;
        adjacent: string;
        without: string;
      };
    };
    savedFiltersLoading: string;
    noSavedFilter: string;
    systemPresets: string;
    advanced: string;
    systemPresetScopes: {
      preserve: string;
      event: string;
      session: string;
      visitor: string;
    };
    systemPresetItems: {
      directTraffic: {
        name: string;
        description: string;
      };
      organicSearchDiscovery: {
        name: string;
        description: string;
      };
      campaignTaggedTraffic: {
        name: string;
        description: string;
      };
      mobileTraffic: {
        name: string;
        description: string;
      };
      bouncedSessions: {
        name: string;
        description: string;
      };
      returningVisitors: {
        name: string;
        description: string;
      };
    };
    savedFiltersPersonal: string;
    savedFiltersTeam: string;
    savedFiltersAuthor: string;
    savedFiltersPrivate: string;
    savedFiltersTeamShared: string;
    saveThisFilter: string;
    saveAsThisFilter: string;
    manageThisFilter: string;
    finishEditingFilter: string;
    createSavedFilter: string;
    manageSavedFilter: string;
    savedFilterName: string;
    savedFilterDescription: string;
    scopeLabel: string;
    scopeAuto: string;
    scopeEvent: string;
    scopeSession: string;
    scopeVisitor: string;
    savedFilterVisibility: string;
    savedFilterVisibilityPrivate: string;
    savedFilterVisibilityTeam: string;
    savedFilterCreateDescription: string;
    savedFilterManageDescription: string;
    editSavedFilter: string;
    deleteSavedFilter: string;
    deleteSavedFilterTitle: string;
    deleteSavedFilterDescription: string;
    savedFilterCancel: string;
    savedFilterSave: string;
    savedFilterSaving: string;
    savedFilterDelete: string;
    savedFilterDeleting: string;
    savedFilterOperationFailed: string;
    apply: string;
    allConditions: string;
    anyCondition: string;
    condition: string;
    group: string;
    invertCondition: string;
    exclude: string;
    addGroup: string;
    invalid: string;
  };
  realtime: {
    title: string;
    logTitleSeparator: string;
    activeNow: string;
    liveCount: string;
    liveMetrics: string;
    connected: string;
    connecting: string;
    reconnecting: string;
    failed: string;
    recentEvents: string;
    enterPage: string;
    leavePage: string;
    viewPage: string;
    customEvent: string;
    detailsTitle: string;
    browsingSection: string;
    geographySection: string;
    sourceSection: string;
    statusLabels: {
      active: string;
      completed: string;
      open: string;
      complete: string;
      hidden_pending: string;
    };
    visibilityStateLabels: {
      visible: string;
      hidden: string;
    };
    visibilityVisible: string;
    visibilityHidden: string;
    visibilityChange: string;
    visitorHistorySection: string;
    visitorHistorySubtitle: string;
    visitorHistoryRange: string;
    visitorHistoryEmpty: string;
    visitorMapUnavailable: string;
    visitorId: string;
    sessionId: string;
    visitId: string;
    eventTime: string;
    eventKind: string;
    eventName: string;
    traceId: string;
    receivedAt: string;
    startedAt: string;
    previousVisitStartedAt: string;
    isEU: string;
    queryString: string;
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
    utmTerm: string;
    utmContent: string;
    browserVersion: string;
    osVersion: string;
    status: string;
    visibilityState: string;
    duration: string;
    durationSource: string;
    exitReason: string;
    leaveAt: string;
  };
  dashboard: {
    statsLabel: string;
    stats: {
      visitors: string;
      visits: string;
      pageviews: string;
      viewsPerVisit: string;
      bounceRate: string;
      visitDuration: string;
      scrollDepth: string;
    };
    details: string;
    detailsTitle: string;
    notSet: string;
    cards: {
      sources: string;
      pages: string;
      locations: string;
      devices: string;
    };
    tabs: {
      channels: string;
      sources: string;
      campaigns: string;
      utm: {
        source: string;
        medium: string;
        campaign: string;
        term: string;
        content: string;
      };
      topPages: string;
      entryPages: string;
      exitPages: string;
      map: string;
      countries: string;
      regions: string;
      cities: string;
      browsers: string;
      operatingSystems: string;
      devices: string;
    };
    columns: {
      source: string;
      channel: string;
      page: string;
      entryPage: string;
      exitPage: string;
      country: string;
      region: string;
      city: string;
      browser: string;
      operatingSystem: string;
      device: string;
      visitors: string;
      visits: string;
      pageviews: string;
      events: string;
      bounceRate: string;
      timeOnPage: string;
      scrollDepth: string;
    };
    goals: {
      title: string;
      goal: string;
      uniques: string;
      total: string;
      conversionRate: string;
      revenue: string;
      averageRevenue: string;
    };
    properties: {
      title: string;
      key: string;
    };
  };
  overview: {
    title: string;
    trendTitle: string;
    direct: string;
    channelLabels: {
      direct: string;
      ai_assistants: string;
      organic_search: string;
      social: string;
      paid_search: string;
      paid_social: string;
      display: string;
      email: string;
      affiliate: string;
      referral: string;
      campaign: string;
      other: string;
    };
    searchInTab: string;
  };
  install: {
    title: string;
    platforms: {
      html: string;
      wordpress: string;
      shopify: string;
      nextjs: string;
      gtm: string;
    };
    steps: {
      html: string;
      wordpress: string;
      shopify: string;
      nextjs: string;
      gtm: string;
    };
    waiting: string;
    received: string;
    firstViewsTitle: string;
    nextReports: string;
    nextInvite: string;
    dismiss: string;
  };
  pages: {
    noQuery: string;
  };
  referrers: Record<string, never>;
  campaigns: {
    notSet: string;
  };
  sessions: Record<string, never>;
  sessionDetail: {
    yes: string;
    no: string;
  };
  events: {
    title: string;
    detailTitle: string;
    backToEvents: string;
    totalEvents: string;
    eventTypes: string;
    sessions: string;
    visitors: string;
    avgEventsPerSession: string;
    shareOfAllEvents: string;
    triggerCount: string;
    triggerVisitors: string;
    trendTitle: string;
    topEvents: string;
    recordsTitle: string;
    fieldsTitle: string;
    fieldsSubtitle: string;
    fieldValuesTitle: string;
    fieldValuesSubtitle: string;
    fieldValuesEmpty: string;
    payloadFilter: string;
    payloadFilterTitle: string;
    payloadFilterSubtitle: string;
    payloadFilterPlaceholder: string;
    payloadFilterApply: string;
    payloadFilterClear: string;
    payloadFilterInvalid: string;
    expandField: string;
    collapseField: string;
    search: string;
    eventName: string;
    eventId: string;
    occurredAt: string;
    receivedAt: string;
    page: string;
    context: string;
    visitor: string;
    visit: string;
    referrer: string;
    location: string;
    browser: string;
    os: string;
    device: string;
    payload: string;
    nodeCount: string;
    payloadFields: string;
    values: string;
    nodes: string;
    occurrences: string;
    openVisitor: string;
    openSession: string;
    integratingEvent: string;
    copyJson: string;
    copiedJson: string;
    copyJsonFailed: string;
    copyValue: string;
    copiedValue: string;
    copyValueFailed: string;
    loadError: string;
    detailNotFound: string;
    empty: string;
    noCustomEvents: string;
    emptyFields: string;
    noEventName: string;
    loading: string;
    other: string;
  };
  funnels: {
    title: string;
    listTitle: string;
    conversionRecords: string;
    converted: string;
    dropped: string;
    open: string;
    moreActions: string;
    createTitle: string;
    nameLabel: string;
    namePlaceholder: string;
    stepsLabel: string;
    addStep: string;
    removeStep: string;
    progression: string;
    conversionWindow: string;
    custom: string;
    customWindowHours: string;
    stepFilter: string;
    filter: string;
    apply: string;
    condition: string;
    conditions: string;
    expression: string;
    filterPlaceholder: string;
    invalidFilter: string;
    dragStep: string;
    unnamed: string;
    oneHour: string;
    oneDay: string;
    sevenDays: string;
    thirtyDays: string;
    save: string;
    saveEdit: string;
    edit: string;
    editTitle: string;
    creating: string;
    cancel: string;
    delete: string;
    deleteTitle: string;
    deleteDescription: string;
    deleteConfirm: string;
    deleting: string;
    detailLoadError: string;
    invalidFunnel: string;
    created: string;
    createFailed: string;
    updatedSuccess: string;
    saveFailed: string;
    deleted: string;
    deleteFailed: string;
    overallConversion: string;
    startedSessions: string;
    startedVisitors: string;
    convertedSessions: string;
    convertedVisitors: string;
    largestDropOff: string;
    noDropOff: string;
    step: string;
    sessions: string;
    visitors: string;
    conversion: string;
    stepConversion: string;
    dropOff: string;
    updated: string;
  };
  goals: {
    title: string;
    open: string;
    moreActions: string;
    createTitle: string;
    nameLabel: string;
    namePlaceholder: string;
    filter: string;
    revenueCurrency: string;
    noRevenue: string;
    revenueCurrencyHint: string;
    revenueCurrencyEventsOnly: string;
    trigger: string;
    triggerFilter: string;
    triggerScrollDepth: string;
    scrollThreshold: string;
    scrollThresholdInvalid: string;
    pagePath: string;
    pagePathPlaceholder: string;
    pagePathHint: string;
    pagePathWildcardUnsupported: string;
    scrollGoalName: string;
    scrollGoalNameOnPage: string;
    apply: string;
    cancel: string;
    save: string;
    saveEdit: string;
    edit: string;
    editTitle: string;
    creating: string;
    delete: string;
    deleteTitle: string;
    deleteDescription: string;
    deleteConfirm: string;
    detailLoadError: string;
    invalidGoal: string;
    created: string;
    updatedSuccess: string;
    saveFailed: string;
    deleted: string;
    deleteFailed: string;
    sessions: string;
    visitors: string;
    total: string;
    converted: string;
    conversion: string;
    revenue: string;
    averageRevenue: string;
    timeseries: string;
    updated: string;
  };
  conversions: {
    new: string;
    newGoal: string;
    newGoalDescription: string;
    newFunnel: string;
    newFunnelDescription: string;
    empty: string;
    emptyMemberHint: string;
  };
  visitors: Record<string, never>;
  visitorDetail: Record<string, never>;
  retention: Record<string, never>;
  geo: {
    investigation: {
      typeLabels: Record<string, string>;
    };
  };
  devices: {
    dimensions: Record<string, never>;
    screenBucketLabels: Record<string, never>;
  };
  browsers: Record<string, never>;
  performance: Record<string, never>;
  share: {
    noData: string;
  };
  siteSettings: {
    title: string;
    sections: {
      basic: {
        title: string;
      };
      tracking: {
        title: string;
      };
      blocking: {
        title: string;
      };
      protection: {
        title: string;
      };
      danger: {
        title: string;
      };
      install: {
        title: string;
      };
      advanced: {
        title: string;
      };
    };
    nameLabel: string;
    domainLabel: string;
    publicSharingTitle: string;
    publicEnabledLabel: string;
    publicSlugLabel: string;
    publicSlugPlaceholder: string;
    publicSlugHint: string;
    publicLinkLabel: string;
    copiedLink: string;
    botProtectionEnabledLabel: string;
    botProtectionEnabledHint: string;
    hostingProxyBlockingEnabledLabel: string;
    hostingProxyBlockingEnabledHint: string;
    trackQueryParamsLabel: string;
    trackHashLabel: string;
    blockingRulesSave: string;
    blockingRulesDialogs: {
      searchButton: string;
      searchTitle: string;
      searchDescription: string;
      searchInputLabel: string;
      searchInputPlaceholder: string;
      searchCountryLabel: string;
      searchRegionLabel: string;
      searchBack: string;
      searchLoading: string;
      searchNoResults: string;
      searchLoadError: string;
      searchClose: string;
    };
    blockingRulesFields: {
      domains: {
        title: string;
        placeholder: string;
      };
      paths: {
        title: string;
        placeholder: string;
      };
      queryParameters: {
        title: string;
        placeholder: string;
      };
      referrers: {
        title: string;
        placeholder: string;
      };
      userAgents: {
        title: string;
        placeholder: string;
      };
      ips: {
        title: string;
        placeholder: string;
      };
      asns: {
        title: string;
        placeholder: string;
      };
      countries: {
        title: string;
        placeholder: string;
      };
      regions: {
        title: string;
        placeholder: string;
      };
    };
    ignoreDoNotTrackLabel: string;
    autoTrackOutboundLinksLabel: string;
    autoTrackOutboundLinksHint: string;
    autoTrackFileDownloadsLabel: string;
    autoTrackFileDownloadsHint: string;
    track404PagesLabel: string;
    track404PagesHint: string;
    save: string;
    saving: string;
    scriptHint: string;
    copyScript: string;
    copiedScript: string;
    scriptUnavailable: string;
    deleteTitle: string;
    deleteSubtitle: string;
    delete: string;
    deleting: string;
    deleteConfirm: string;
    toasts: {
      saved: string;
      saveFailed: string;
      scriptLoadFailed: string;
      settingsLoadFailed: string;
      settingsPropagationHint: string;
      deleted: string;
      deleteFailed: string;
      invalidInput: string;
    };
    publicEnabledHint: string;
    blockingRulesHelp: string;
    blockingRuleTypeLabel: string;
    blockingRuleActionLabel: string;
    blockingRuleValueLabel: string;
    blockingRuleBlock: string;
    blockingRuleAllow: string;
    blockingRuleAdd: string;
    blockingRuleRemove: string;
    blockingRulesEmpty: string;
    blockingRuleInvalid: string;
    blockingRulesTooMany: string;
  };
  accountSettings: {
    emailManagedByGateway: string;
    profileTitle: string;
    nicknameLabel: string;
    nicknamePlaceholder: string;
    emailLabel: string;
    profileSaved: string;
    profileSaveFailed: string;
    timeZoneTitle: string;
    browserUnavailable: string;
    useBrowser: string;
    saved: string;
    saveFailed: string;
    timeZoneLabel: string;
    aiClientsTitle: string;
    aiClientsLabel: string;
    aiClientsDescription: string;
    aiClientsDocs: string;
  };
  notificationCenter: {
    title: string;
    empty: string;
    loading: string;
    markRead: string;
    markAllRead: string;
    loadFailed: string;
    markReadFailed: string;
    markAllReadSuccess: string;
    markAllReadFailed: string;
    tabs: {
      all: string;
      unread: string;
    };
    severities: {
      info: string;
      success: string;
      warning: string;
      critical: string;
    };
    preferencesTitle: string;
    emailNotificationsLabel: string;
    reportsUnreadLabel: string;
    alertsUnreadLabel: string;
    preferencesSaveFailed: string;
    detailFields: Record<string, never>;
    noUnread: string;
    emailFailed: string;
    emailSkipped: string;
  };
  notificationEmail: {
    common: {
      brand: string;
      date: string;
      coreMetrics: string;
      topPages: string;
      topReferrers: string;
      views: string;
      visitors: string;
      sessions: string;
      visits: string;
      viewsUnit: string;
      direct: string;
      window: string;
      currentValue: string;
      previousValue: string;
      change: string;
      noPageData: string;
      noReferrerData: string;
      footer: string;
      severity: {
        info: string;
        success: string;
        warning: string;
        critical: string;
      };
    };
    report: {
      subject: string;
      title: string;
      summary: string;
      periodLabels: {
        weekly: string;
        monthly: string;
      };
    };
    change: {
      subject: string;
      title: string;
      summary: string;
      metric: string;
      windows: {
        last_1h: string;
        last_24h: string;
      };
    };
  };
  runtimeConfigError: {
    title: string;
    heading: string;
    setupSummary: string;
    setupCommand: string;
    generateHint: string;
    devSetup: string;
    docsLabel: string;
  };
  login: Record<string, never>;
  accountLinks: {
    invite: {
      roles: Record<string, never>;
    };
    resetPassword: Record<string, never>;
  };
  empty: Record<string, never>;
  errorPage: {
    notFoundTitle: string;
    notFoundDescription: string;
    errorTitle: string;
    errorDescription: string;
    homeAction: string;
    reportAction: string;
  };
  actions: {
    switchToLight: string;
    switchToDark: string;
  };
  teamSelect: {
    groups: Record<string, never>;
    cancel: string;
  };
  teamManagement: {
    stats: Record<string, never>;
    toasts: Record<string, never>;
    sites: {
      aggregateTitle: string;
      openAnalytics: string;
      title: string;
      pagesPerSession: string;
      public: string;
      openPublic: string;
    };
    notifications: {
      empty: string;
      enabledCount: string;
      loadingRules: string;
      loadRulesFailed: string;
      createRule: string;
      editRule: string;
      dialogDescription: string;
      sendScheduleSection: string;
      conditionSection: string;
      nameLabel: string;
      siteLabel: string;
      chooseSite: string;
      ruleTypeLabel: string;
      scheduleLabel: string;
      timeLabel: string;
      timezoneLabel: string;
      dayLabel: string;
      dayOfMonthLabel: string;
      addCondition: string;
      removeCondition: string;
      windowLabel: string;
      directionLabel: string;
      percentLabel: string;
      alertCondition: string;
      directions: {
        spike: string;
        drop: string;
      };
      pleaseChooseSite: string;
      ruleCreated: string;
      ruleUpdated: string;
      createRuleFailed: string;
      updateRuleFailed: string;
      deleteConfirm: string;
      ruleDeleted: string;
      deleteRuleFailed: string;
      actions: string;
      edit: string;
      enable: string;
      disable: string;
      delete: string;
      saveRule: string;
      scheduleWeekly: string;
      scheduleMonthly: string;
      defaultNames: {
        report: string;
        change: string;
      };
      columns: {
        name: string;
        type: string;
        condition: string;
        status: string;
      };
      status: {
        enabled: string;
        disabled: string;
      };
      ruleTypes: {
        report: string;
        change: string;
      };
      ruleTypeDescriptions: {
        report: string;
        change: string;
      };
      scheduleKinds: {
        weekly: string;
        monthly: string;
      };
      weekDays: string[];
      windows: {
        last_1h: string;
        last_24h: string;
      };
      addSiteFirst: string;
      deleteDescription: string;
    };
    publicLinks: {
      copyLink: string;
      columns: Record<string, never>;
    };
    apiKeys: {
      status: Record<string, never>;
      scopes: Record<string, never>;
      scopeDescriptions: Record<string, never>;
      scopeGroups: Record<string, never>;
      columns: Record<string, never>;
    };
    settings: Record<string, never>;
    members: {
      inviteStatuses: Record<string, never>;
      columns: Record<string, never>;
      roleLabels: Record<string, never>;
    };
  };
  managementPages: {
    versionUpdates: Record<string, never>;
  };
  adminUsers: {
    columns: Record<string, never>;
  };
  adminSites: {
    createTitle: string;
    name: string;
    domain: string;
    create: string;
    creating: string;
    createSuccess: string;
    createFailed: string;
    invalidDomain: string;
    columns: Record<string, never>;
  };
  adminTeams: {
    columns: Record<string, never>;
  };
  requestObservation: {
    tabs: Record<string, never>;
    requestKindLabels: Record<string, never>;
    normalDetail: Record<string, never>;
  };
  systemSettings: {
    notificationEmailTitle: string;
    emailGatewayNotReady: string;
    emailSenderLabel: string;
    retentionTitle: string;
    retentionDescription: string;
    notificationAttentionDaysLabel: string;
    notificationDefaultDaysLabel: string;
    analyticsDetailDaysLabel: string;
    analyticsKeepForever: string;
    retentionRangeHint: string;
    retentionSave: string;
    retentionSaving: string;
    retentionSaved: string;
    retentionSaveFailed: string;
    enabledOn: string;
    enabledOff: string;
    cancel: string;
    retentionLowerTitle: string;
    retentionLowerDescription: string;
    retentionLowerConfirm: string;
  };
  loginForm: Record<string, never>;
  logoutAction: Record<string, never>;
  sidebarHeader: {
    everyApp: string;
    backToEveryApp: string;
  };
  appNav: {
    appearance: string;
    mainNavigation: string;
    toggleSidebar: string;
    sites: string;
    allSites: string;
    inbox: string;
    settings: string;
    switchSite: string;
    siteSettings: string;
    addSite: string;
  };
  teamEntry: Record<string, never>;
  getStarted: {
    title: string;
    progress: string;
    showSteps: string;
    hideSteps: string;
    completed: string;
    steps: {
      site: string;
      tracking: string;
      team: string;
      notifications: string;
      sharing: string;
    };
    noSitesTitle: string;
    memberNoSitesTitle: string;
    memberNoSitesDescription: string;
    addSite: string;
    waitingTitle: string;
    copy: string;
    copied: string;
  };
  settingsNav: {
    label: string;
    system: string;
    account: string;
    notifications: string;
    cancel: string;
  };
}

const enMessages = {
  appName: "OpenAnalytics",
  navigation: {
    overview: "Overview",
    realtime: "Real-time",
    pages: "Pages",
    funnels: "Goals & funnels",
    visitors: "Visitors",
    settings: "Site settings",
  },
  common: {
    deviceLabels: {
      desktop: "Desktop",
      mobile: "Mobile",
      tablet: "Tablet",
    },
    id: "ID",
    views: "Views",
    sessions: "Sessions",
    visitors: "Visitors",
    bounceRate: "Bounce rate",
    avgDuration: "Avg. duration",
    path: "Path",
    title: "Title",
    hostname: "Hostname",
    referrerHost: "Referrer host",
    referrer: "Referrer",
    browser: "Browser",
    operatingSystem: "Operating system",
    deviceType: "Device type",
    country: "Country",
    region: "Region",
    regionCode: "Region code",
    city: "City",
    continent: "Continent",
    latitude: "Latitude",
    longitude: "Longitude",
    continentLabels: {
      AF: "Africa",
      AN: "Antarctica",
      AS: "Asia",
      EU: "Europe",
      NA: "North America",
      OC: "Oceania",
      SA: "South America",
      AFRICA: "Africa",
      ANTARCTICA: "Antarctica",
      ASIA: "Asia",
      EUROPE: "Europe",
      "NORTH AMERICA": "North America",
      OCEANIA: "Oceania",
      "SOUTH AMERICA": "South America",
    },
    timezone: "Time zone",
    screenSize: "Screen size",
    loading: "Loading",
    noData: "No data",
    loadFailed: "Couldn't load",
    retry: "Retry",
    filteredEmpty: "Nothing matches these filters",
    clearFilters: "Clear filters",
    unknown: "Unknown",
    system: "System",
    theme: "Theme",
    language: "Language",
    search: "Search",
    open: "Open",
    sortBy: "Sort by {label}",
    change: "Change",
    new: "New",
    tableExport: {
      action: "Export",
      title: "Export CSV",
      description:
        "Download every row for the range and filters as a CSV file.",
      scopeLabel: "Scope",
      currentTab: "Current tab",
      allTabs: "All tabs",
      fileNameLabel: "File name",
      download: "Export CSV",
      empty: "No rows available to export.",
    },
    sitesFiltered: "{active} / {total} sites filtered",
    cumulativeTraffic: "Cumulative traffic",
  },
  ranges: {
    today: "Today",
    yesterday: "Yesterday",
    last24h: "Last 24 hours",
    last7d: "Last 7 days",
    last30d: "Last 30 days",
    last90d: "Last 90 days",
    monthToDate: "Month to date",
    lastMonth: "Last month",
    yearToDate: "Year to date",
    last12m: "Last 12 months",
    allTime: "All time",
    custom: "Custom range",
  },
  intervals: {
    minute: "Minute",
    hour: "Hour",
    day: "Day",
    week: "Week",
    month: "Month",
  },
  dashboardHeader: {
    interval: "Interval",
    compareButton: "Compare",
    compareTitle: "Comparison settings",
    compareTimeLabel: "Comparison period",
    compareCurrentPeriod: "Current period",
    comparePreviousPeriod: "Previous period",
    compareYearOverYear: "Year over year",
    compareFilterLabel: "Comparison filter",
    compareFollowCurrentFilter: "Follow current filter",
    compareCustomFilter: "Custom filter",
    compareApply: "Apply comparison",
    compareCancel: "Cancel",
    filterButton: "Filter",
    filterButtonEvent: "Filter (event)",
    filterButtonSession: "Filter (session)",
    filterButtonVisitor: "Filter (visitor)",
    customHint: "Select a start and end date.",
    customPendingEnd: "Now pick an end date.",
    customApply: "Apply date range",
    filterTitle: "Filters",
    previousPeriod: "Previous period",
    yearAgo: "Same period last year",
    nextPeriod: "Next period",
    customSelectionSummary: "Selected range: {from} to {to} ({days} days)",
  },
  filters: {
    clear: "Clear",
  },
  filterPills: {
    label: "Filters",
    is: "{field} is {value}",
    isNot: "{field} is not {value}",
    valueSeparator: " or ",
    remove: "Remove filter: {filter}",
  },
  conditionDescription: {
    and: "and",
    or: "or",
    not: "not ({description})",
    emptyFilter: "No filter conditions",
    filterEquals: "{field} equals {value}",
    filterNotEquals: "{field} does not equal {value}",
    filterAnyOf: "{field} is one of {values}",
    filterNoneOf: "{field} is none of {values}",
    filterBetween: "{field} is between {from} and {to}",
    filterContains: "{field} contains {value}",
    filterStartsWith: "{field} starts with {value}",
    filterEndsWith: "{field} ends with {value}",
    filterGreaterThan: "{field} is greater than {value}",
    filterGreaterThanOrEqual: "{field} is greater than or equal to {value}",
    filterLessThan: "{field} is less than {value}",
    filterLessThanOrEqual: "{field} is less than or equal to {value}",
    filterExists: "{field} exists",
    filterNotExists: "{field} does not exist",
    filterIsNull: "{field} is null",
    filterNotNull: "{field} is not null",
    filterIsEmpty: "{field} is empty",
    filterNotEmpty: "{field} is not empty",
  },
  filterBuilder: {
    fieldGroups: {
      advanced: "Advanced",
      page: "Page",
      session: "Session",
      visitor: "Visitor",
      referrer: "Sources & channels",
      campaign: "Campaign",
      client: "Client",
      geography: "Geography",
      event: "Event",
      acquisition: "Acquisition",
      device: "Device",
      geo: "Geography",
      performance: "Performance",
      user: "User",
      time: "Time",
      aggregation: "Aggregation",
      calculation: "Calculation",
      relation: "Behavior relations",
    },
    fieldLabels: {
      "page.path": "Page path",
      "page.title": "Page title",
      "page.collection": "Page collection",
      "page.hostname": "Page domain",
      "page.query": "Query parameters",
      "page.hash": "URL hash",
      "session.entryPath": "Entry page",
      "session.exitPath": "Exit page",
      "referrer.domain": "Referrer domain",
      "referrer.url": "Referrer URL",
      "traffic.channel": "Traffic channel",
      "utm.source": "UTM source",
      "utm.medium": "UTM medium",
      "utm.campaign": "UTM campaign",
      "utm.term": "UTM term",
      "utm.content": "UTM content",
      "client.browser": "Browser",
      "client.browserVersion": "Browser version",
      "client.browserEngine": "Browser engine",
      "client.os": "Operating system",
      "client.osVersion": "Operating system version",
      "client.deviceType": "Device type",
      "client.language": "Language",
      "client.screenSize": "Screen size",
      "geo.country": "Country / region",
      "geo.region": "Province / state / region",
      "geo.city": "City",
      "geo.continent": "Continent",
      "geo.timeZone": "Time zone",
      "event.collection": "Event collection",
      "event.name": "Event name",
      "event.payload": "Properties",
      "page.durationMs": "Time on page",
      "page.scrollDepth": "Scroll depth",
      "session.collection": "Session collection",
      "session.durationMs": "Session duration",
      "session.views": "Page views",
      "session.events": "Event count",
      "session.bounce": "Bounced",
      "visitor.collection": "Visitor collection",
      "visitor.sessions": "Session count",
      "visitor.views": "Page views",
      "visitor.events": "Event count",
      "performance.ttfbMs": "TTFB",
      "performance.fcpMs": "FCP",
      "performance.lcpMs": "LCP",
      "performance.cls": "CLS",
      "performance.inpMs": "INP",
      "user.id": "User ID",
      "user.name": "User name",
      "client.screenWidth": "Screen width",
      "client.screenHeight": "Screen height",
      "geo.isEU": "EU region",
      time: "Time",
      "time(...)": "Occurrence time",
      $items: "Items in period",
      $span: "Sequence span",
      "$gap(...)": "Gap between steps",
      "$same(...)": "Same value across steps",
      "bucket(...)": "Time bucket",
      "window(...)": "Relative time window",
      "periods(...)": "Period groups",
      "count(...)": "Count",
      "first(...)": "First",
      "last(...)": "Last",
      "nth(...)": "Nth",
      "countDistinct(...)": "Distinct count",
      "sum(...)": "Sum",
      "avg(...)": "Average",
      "min(...)": "Minimum",
      "max(...)": "Maximum",
      "add(...)": "Add",
      "sub(...)": "Subtract",
      "mul(...)": "Multiply",
      "div(...)": "Divide",
      "sequence(...)": "Behavior sequence",
      "adjacent(...)": "Adjacent sequence",
      "without(...)": "Exclude intermediate behavior",
    },
    operatorLabels: {
      eq: "Equals",
      neq: "Does not equal",
      in: "Is one of",
      notIn: "Is not one of",
      contains: "Contains",
      startsWith: "Starts with",
      endsWith: "Ends with",
      gt: "Greater than",
      gte: "Greater than or equal to",
      lt: "Less than",
      lte: "Less than or equal to",
      between: "Between",
      exists: "Exists",
      notExists: "Does not exist",
      isNull: "Is null",
      notNull: "Is not null",
      isEmpty: "Is empty",
      notEmpty: "Is not empty",
    },
    valueType: "Value type",
    valueKinds: {
      string: "Text",
      enum: "Option",
      number: "Number",
      boolean: "Boolean",
      date: "Date",
      datetime: "Date and time",
      "json-scalar": "JSON scalar",
    },
    booleanTrue: "True",
    booleanFalse: "False",
    valueUnset: "(not set)",
    valueLoading: "Loading values",
    valueSearchPlaceholder: "Search or enter a value",
    valueListPlaceholder: "Search or enter a value, then press Enter",
    valueShowMore: "Show more",
    removeValue: 'Remove filter value "{value}"',
    rangeStartPlaceholder: "Lower bound",
    rangeEndPlaceholder: "Upper bound",
    unitAriaLabel: "Display unit",
    durationUnit: "Duration unit",
    units: {
      hours: "Hours",
      minutes: "Minutes",
      seconds: "Seconds",
      milliseconds: "Milliseconds",
      percent: "%",
      perMille: "‰",
      pixels: "Pixels",
    },
    jsonPointer: "JSON pointer",
    jsonPointerPlaceholder: "Search or enter a JSON pointer",
    match: "Match",
    expression: "Filter expression",
    expressionPlaceholder: "Filter expression...",
    naturalLanguageDescription: "Natural-language description",
    expressionInvalid: "Invalid expression. Click to view syntax help.",
    expressionHelpTitle: "Filter expression syntax",
    expressionHelpDescription:
      "The fields and operators you can use in a filter expression.",
    expressionHelpSyntax: "Syntax",
    expressionHelpLogicDescription:
      "AND binds more tightly than OR. Use parentheses for nesting; AND(...) and OR(...) preserve an explicit one-condition group.",
    expressionHelpValues: "Values",
    expressionHelpValuesDescription:
      "Strings use JSON double quotes. Numbers and booleans are unquoted. Use [value, value] for sets and exactly two ordered values with between.",
    expressionHelpOperators: "Available operators",
    expressionHelpUnaryOperators: "Operators without a value",
    expressionHelpFields: "Available fields",
    expressionHelpFieldType: "Type",
    expressionHelpFieldOperators: "Operators",
    expressionHelpOtherFields: "Other",
    expressionHelpContextTitle: "Occurrence time and context intrinsics",
    expressionHelpContextDescription:
      "Lowercase dotted names are registered fields; uppercase PAGE, EVENT, SESSION, and VISITOR are entity collections. Inside an entity selector, $.member refers to its current entity, and -> explicitly projects a collection member. @ names a temporal anchor; Sequence and Period predicates also provide $span, $gap, and $items.",
    expressionHelpContextExamples:
      'time(last(PAGE)) gte @now-14d\nsequence([EVENT { $.name eq "signup" }, EVENT { $.name eq "purchase" }]) {\n  $span lte 14d AND $gap(1, 2) lte 7d AND $same($.payload("/productId"))\n} exists\nperiods(EVENT, 1w) { count($items) gte 3 } exists',
    advancedEditor: {
      not: "NOT",
      removeNot: "Remove NOT",
      matchAll: "Match all",
      matchAny: "Match any",
      addCondition: "Add condition",
      addGroup: "Add group",
      wrapInNot: "Wrap in NOT",
      remove: "Remove",
      condition: "Condition",
      literalValue: "Literal value",
      compareWithExpression: "Compare with expression",
      valuesAsJson: "Filter values as JSON",
      scalarArrayHelp: "Enter an array of JSON scalar values.",
      chooseValue: "Choose a value",
      filterValue: "Filter value",
      durationAmount: "Duration amount",
      jsonPointer: "Payload JSON pointer",
      jsonPointerPlaceholder: "/property/path",
      entityMember: "Entity member",
      nthIndex: "Nth item index",
      fromStep: "From step",
      toStep: "To step",
      occurrenceKind: "Occurrence selector",
      occurrenceEntity: "Occurrence type",
      occurrenceIndex: "Occurrence index",
      correlationTarget: "Value shared by each step",
      periodItemCount: "Items per period",
      nestedTooDeep: "Expression is nested too deeply.",
      applyOffset: "Apply offset",
      removeStep: "Remove step",
      addStep: "Add sequence step",
      excludedActivity: "Excluded activity",
      fixedTime: "Fixed time",
      toggleOffsetSign: "Toggle time offset sign",
      timeUnits: {
        milliseconds: "milliseconds",
        seconds: "seconds",
        minutes: "minutes",
        hours: "hours",
        days: "days",
        weeks: "weeks",
        months: "months",
        years: "years",
      },
      coreRelation: "Advanced filter",
      coreRelationExpression: "Advanced filter expression",
      structuredEditor: "Advanced filter controls",
      unavailableForObservation:
        "Advanced filters are unavailable for goal and funnel steps.",
      targetKinds: {
        time: "Time",
        field: "Field",
        "event-payload": "Event payload",
        "entity-root": "Entity collection",
        "context-root": "Context",
        "context-intrinsic": "Context intrinsic",
        "occurrence-time": "Occurrence time",
        member: "Member",
        selector: "Selector",
        projection: "Projection",
        reducer: "Reducer",
        arithmetic: "Arithmetic",
        duration: "Duration",
        "time-anchor": "Relative time",
        "sequence-span": "Sequence span",
        "sequence-gap": "Sequence gap",
        "sequence-same": "Sequence shared value",
        "period-items": "Period items",
        bucket: "Time bucket",
        window: "Window",
        periods: "Periods",
        sequence: "Sequence",
        adjacent: "Adjacent sequence",
        without: "Sequence without",
      },
    },
    savedFiltersLoading: "Loading saved filters...",
    noSavedFilter: "No saved filter",
    systemPresets: "System presets",
    advanced: "Advanced",
    systemPresetScopes: {
      preserve: "Keep current scope",
      event: "Event scope",
      session: "Session scope",
      visitor: "Visitor scope",
    },
    systemPresetItems: {
      directTraffic: {
        name: "Direct traffic",
        description: "Visits with no external referrer.",
      },
      organicSearchDiscovery: {
        name: "Organic search discovery",
        description: "Search-engine referrals without campaign tags.",
      },
      campaignTaggedTraffic: {
        name: "Campaign-tagged traffic",
        description: "Visits carrying a campaign source, medium, or name.",
      },
      mobileTraffic: {
        name: "Mobile traffic",
        description: "Visits from mobile devices.",
      },
      bouncedSessions: {
        name: "Bounced sessions",
        description: "Sessions containing a single page view.",
      },
      returningVisitors: {
        name: "Returning visitors",
        description: "Visitors with at least two sessions.",
      },
    },
    savedFiltersPersonal: "Personal filters",
    savedFiltersTeam: "Organization filters",
    savedFiltersAuthor: "Author: {name}",
    savedFiltersPrivate: "Personal",
    savedFiltersTeamShared: "Shared with your organization",
    saveThisFilter: "Save this filter",
    saveAsThisFilter: "Save as this filter",
    manageThisFilter: "Manage this filter",
    finishEditingFilter: "Finish editing",
    createSavedFilter: "Save filter",
    manageSavedFilter: "Manage filter",
    savedFilterName: "Name",
    savedFilterDescription: "Notes",
    scopeLabel: "Filter scope",
    scopeAuto: "Automatically choose based on the current page",
    scopeEvent: "Filter events matching these conditions",
    scopeSession: "Filter sessions meeting these conditions",
    scopeVisitor: "Filter visitors meeting these conditions",
    savedFilterVisibility: "Visibility",
    savedFilterVisibilityPrivate: "Only me",
    savedFilterVisibilityTeam: "Share with your organization",
    savedFilterCreateDescription:
      "Save the current filter expression to apply it again later.",
    savedFilterManageDescription:
      "Update this filter's details or start editing its conditions.",
    editSavedFilter: "Edit this filter",
    deleteSavedFilter: "Delete this filter",
    deleteSavedFilterTitle: "Delete this filter?",
    deleteSavedFilterDescription:
      "This can't be undone, and others in your organization will lose access to it.",
    savedFilterCancel: "Cancel",
    savedFilterSave: "Save",
    savedFilterSaving: "Saving...",
    savedFilterDelete: "Delete",
    savedFilterDeleting: "Deleting...",
    savedFilterOperationFailed: "Something went wrong. Try again.",
    apply: "Apply filters",
    allConditions: "All conditions",
    anyCondition: "Any condition",
    condition: "Condition {index}",
    group: "Group {index}",
    invertCondition: "Invert this condition",
    exclude: "Exclude",
    addGroup: "Add group",
    invalid: "Complete each filter condition before applying.",
  },
  realtime: {
    title: "Real-time",
    logTitleSeparator: ":",
    activeNow: "Active now",
    liveCount: "{count} online now",
    liveMetrics:
      "Active now / Visitors in the last 30 minutes / Views in the last 30 minutes",
    connected: "Connected",
    connecting: "Connecting",
    reconnecting: "Reconnecting",
    failed: "Failed",
    recentEvents: "Recent live events",
    enterPage: "Enter page",
    leavePage: "Exit page",
    viewPage: "View page",
    customEvent: "Custom event",
    detailsTitle: "Event details",
    browsingSection: "Browsing",
    geographySection: "Geography",
    sourceSection: "Source",
    statusLabels: {
      active: "Active",
      completed: "Completed",
      open: "Open",
      complete: "Complete",
      hidden_pending: "Pending hidden",
    },
    visibilityStateLabels: {
      visible: "Visible",
      hidden: "Hidden",
    },
    visibilityVisible: "Page became visible",
    visibilityHidden: "Page became hidden",
    visibilityChange: "Page visibility changed",
    visitorHistorySection: "Visitor activity",
    visitorHistorySubtitle:
      "All records for this visitor in the real-time window.",
    visitorHistoryRange: "Activity range",
    visitorHistoryEmpty:
      "No additional records are available for this visitor yet.",
    visitorMapUnavailable: "This event does not include usable coordinates.",
    visitorId: "Visitor ID",
    sessionId: "Session ID",
    visitId: "Visit ID",
    eventTime: "Event time",
    eventKind: "Event kind",
    eventName: "Event name",
    traceId: "Trace ID",
    receivedAt: "Received at",
    startedAt: "Started at",
    previousVisitStartedAt: "Previous visit started at",
    isEU: "EU visitor",
    queryString: "Query string",
    utmSource: "UTM source",
    utmMedium: "UTM medium",
    utmCampaign: "UTM campaign",
    utmTerm: "UTM term",
    utmContent: "UTM content",
    browserVersion: "Browser version",
    osVersion: "OS version",
    status: "Status",
    visibilityState: "Visibility state",
    duration: "Duration",
    durationSource: "Duration source",
    exitReason: "Exit reason",
    leaveAt: "Left at",
  },
  dashboard: {
    statsLabel: "Top stats",
    stats: {
      visitors: "Unique visitors",
      visits: "Total visits",
      pageviews: "Total pageviews",
      viewsPerVisit: "Views per visit",
      bounceRate: "Bounce rate",
      visitDuration: "Visit duration",
      scrollDepth: "Scroll depth",
    },
    details: "Details",
    detailsTitle: "{card} · {tab}",
    notSet: "Not set",
    cards: {
      sources: "Sources",
      pages: "Pages",
      locations: "Locations",
      devices: "Devices",
    },
    tabs: {
      channels: "Channels",
      sources: "Sources",
      campaigns: "Campaigns",
      utm: {
        source: "UTM source",
        medium: "UTM medium",
        campaign: "UTM campaign",
        term: "UTM term",
        content: "UTM content",
      },
      topPages: "Top pages",
      entryPages: "Entry pages",
      exitPages: "Exit pages",
      map: "Map",
      countries: "Countries",
      regions: "Regions",
      cities: "Cities",
      browsers: "Browser",
      operatingSystems: "Operating system",
      devices: "Device type",
    },
    columns: {
      source: "Source",
      channel: "Channel",
      page: "Page",
      entryPage: "Entry page",
      exitPage: "Exit page",
      country: "Country",
      region: "Region",
      city: "City",
      browser: "Browser",
      operatingSystem: "Operating system",
      device: "Device",
      visitors: "Visitors",
      visits: "Visits",
      pageviews: "Pageviews",
      events: "Events",
      bounceRate: "Bounce rate",
      timeOnPage: "Time on page",
      scrollDepth: "Scroll depth",
    },
    goals: {
      title: "Goal conversions",
      goal: "Goal",
      uniques: "Uniques",
      total: "Total",
      conversionRate: "Conversion rate",
      revenue: "Revenue",
      averageRevenue: "Average",
    },
    properties: {
      title: "Properties",
      key: "Property",
    },
  },
  overview: {
    title: "Overview",
    trendTitle: "Traffic trend",
    direct: "Direct",
    channelLabels: {
      direct: "Direct",
      ai_assistants: "AI assistants",
      organic_search: "Organic search",
      social: "Social",
      paid_search: "Paid search",
      paid_social: "Paid social",
      display: "Display ads",
      email: "Email",
      affiliate: "Affiliate",
      referral: "Referral",
      campaign: "Campaign",
      other: "Other",
    },
    searchInTab: "Search {tab}",
  },
  install: {
    title: "Add the script to your site",
    platforms: {
      html: "HTML",
      wordpress: "WordPress",
      shopify: "Shopify",
      nextjs: "Next.js",
      gtm: "Google Tag Manager",
    },
    steps: {
      html: "Paste it before {tag} on every page.",
      wordpress:
        "Add it with a header scripts plugin such as WPCode, or paste it before {tag} in your theme's header.php.",
      shopify:
        "In Online Store → Themes → Edit code, open theme.liquid and paste it before {tag}.",
      nextjs: "Paste it inside {tag} in app/layout.tsx.",
      gtm: "Create a Custom HTML tag with it, trigger it on All Pages, then publish.",
    },
    waiting: "Waiting for the first page view",
    received: "Got your first page view. Reports fill in within a minute.",
    firstViewsTitle: "Your first page views are in.",
    nextReports: "Get reports by email",
    nextInvite: "Invite members",
    dismiss: "Dismiss",
  },
  pages: {
    noQuery: "No query parameters",
  },
  referrers: {},
  campaigns: {
    notSet: "Not set",
  },
  sessions: {},
  sessionDetail: {
    yes: "Yes",
    no: "No",
  },
  events: {
    title: "Events",
    detailTitle: "Event detail",
    backToEvents: "Back to events",
    totalEvents: "Total events",
    eventTypes: "Event types",
    sessions: "Triggered sessions",
    visitors: "Triggered visitors",
    avgEventsPerSession: "Avg. events / session",
    shareOfAllEvents: "Share of all events",
    triggerCount: "Triggers",
    triggerVisitors: "Triggered visitors",
    trendTitle: "Event trend",
    topEvents: "Top events",
    recordsTitle: "Event records",
    fieldsTitle: "Payload fields",
    fieldsSubtitle: "Select a field to inspect its values and metadata.",
    fieldValuesTitle: "Field values",
    fieldValuesSubtitle:
      "Records and occurrence counts for the selected field. Click a row to filter.",
    fieldValuesEmpty: "No values recorded for this field.",
    payloadFilter: "Filter",
    payloadFilterTitle: "Payload filters",
    payloadFilterSubtitle:
      "Add one condition per line. Combine filters with == or !=.",
    payloadFilterPlaceholder: 'path.value == "a"\nlevel != 0',
    payloadFilterApply: "Apply filters",
    payloadFilterClear: "Clear filters",
    payloadFilterInvalid:
      "Couldn't parse the filter conditions. Check the field path, operator, and value.",
    expandField: "Expand field",
    collapseField: "Collapse field",
    search: "Search event name, IDs, visitor, session, page...",
    eventName: "Event name",
    eventId: "Event ID",
    occurredAt: "Occurred",
    receivedAt: "Received",
    page: "Page",
    context: "Context",
    visitor: "Visitor",
    visit: "Visit",
    referrer: "Referrer",
    location: "Location",
    browser: "Browser",
    os: "OS",
    device: "Device",
    payload: "Payload",
    nodeCount: "Node count",
    payloadFields: "Payload fields",
    values: "Values",
    nodes: "Nodes",
    occurrences: "Occurrences",
    openVisitor: "Open visitor",
    openSession: "Open session",
    integratingEvent: "Integrating event ({seconds}s)",
    copyJson: "Copy JSON",
    copiedJson: "JSON copied.",
    copyJsonFailed: "Couldn't copy JSON.",
    copyValue: "Copy value",
    copiedValue: "Value copied.",
    copyValueFailed: "Couldn't copy value.",
    loadError: "Couldn't load event data.",
    detailNotFound: "This event record was not found.",
    empty: "No custom events in this range.",
    noCustomEvents: "No custom events in this period",
    emptyFields: "No payload fields for this event.",
    noEventName: "Missing event name.",
    loading: "Loading",
    other: "Other",
  },
  funnels: {
    title: "Funnels",
    listTitle: "Funnel definitions",
    conversionRecords: "Conversion records",
    converted: "Converted",
    dropped: "Dropped off",
    open: "Open funnel",
    moreActions: "More actions",
    createTitle: "Create funnel",
    nameLabel: "Name",
    namePlaceholder: "Signup activation",
    stepsLabel: "Steps",
    addStep: "Add step",
    removeStep: "Remove step",
    progression: "Count by",
    conversionWindow: "Conversion window",
    custom: "Custom",
    customWindowHours: "Custom window in hours",
    stepFilter: "Step filter",
    filter: "Filter",
    apply: "Apply",
    condition: "condition",
    conditions: "conditions",
    expression: "Filter expression",
    filterPlaceholder: 'e.g. page.path eq "/pricing"',
    invalidFilter: "Invalid filter",
    dragStep: "Drag step",
    unnamed: "(unnamed)",
    oneHour: "1 hour",
    oneDay: "24 hours",
    sevenDays: "7 days",
    thirtyDays: "30 days",
    save: "Create",
    saveEdit: "Save changes",
    edit: "Edit",
    editTitle: "Edit funnel",
    creating: "Creating...",
    cancel: "Cancel",
    delete: "Delete",
    deleteTitle: "Delete funnel",
    deleteDescription:
      "This removes the saved funnel definition. Historical analytics data is not deleted.",
    deleteConfirm: "Delete funnel",
    deleting: "Deleting...",
    detailLoadError: "Couldn't load funnel analysis.",
    invalidFunnel: "Add a name and at least two complete filters.",
    created: "Funnel created.",
    createFailed: "Couldn't create the funnel.",
    updatedSuccess: "Funnel updated.",
    saveFailed: "Couldn't save the funnel.",
    deleted: "Funnel deleted.",
    deleteFailed: "Couldn't delete the funnel.",
    overallConversion: "Overall conversion",
    startedSessions: "Started sessions",
    startedVisitors: "Started visitors",
    convertedSessions: "Converted sessions",
    convertedVisitors: "Converted visitors",
    largestDropOff: "Largest drop-off",
    noDropOff: "No drop-off",
    step: "Step",
    sessions: "Sessions",
    visitors: "Visitors",
    conversion: "Conversion",
    stepConversion: "Step conversion rate",
    dropOff: "Drop-off",
    updated: "Updated",
  },
  goals: {
    title: "Goals",
    open: "Open goal",
    moreActions: "More actions",
    createTitle: "Create goal",
    nameLabel: "Name",
    namePlaceholder: "Purchase completed",
    filter: "Conversion condition",
    revenueCurrency: "Revenue currency",
    noRevenue: "None",
    revenueCurrencyHint:
      "Adds up the revenue of the custom events this goal matches. Revenue in other currencies isn't converted or counted.",
    revenueCurrencyEventsOnly:
      "A goal with revenue must match only custom events, such as an event name.",
    trigger: "Trigger",
    triggerFilter: "Filter",
    triggerScrollDepth: "Scroll depth",
    scrollThreshold: "Scroll depth threshold (1–100%)",
    scrollThresholdInvalid: "Enter a whole number from 1 to 100.",
    pagePath: "Page path",
    pagePathPlaceholder: "/blog*",
    pagePathHint:
      "* matches any characters, slashes included. Leave it empty for every page.",
    pagePathWildcardUnsupported:
      "Use one *, or one at each end, such as /blog* or *docs*.",
    scrollGoalName: "Scroll {threshold}%",
    scrollGoalNameOnPage: "Scroll {threshold}% on {path}",
    apply: "Apply",
    cancel: "Cancel",
    save: "Create",
    saveEdit: "Save changes",
    edit: "Edit",
    editTitle: "Edit goal",
    creating: "Creating...",
    delete: "Delete",
    deleteTitle: "Delete goal",
    deleteDescription:
      "This removes the saved goal definition. Historical analytics data is not deleted.",
    deleteConfirm: "Delete goal",
    detailLoadError: "Couldn't load goal analysis.",
    invalidGoal: "Add a name and a complete conversion condition.",
    created: "Goal created.",
    updatedSuccess: "Goal updated.",
    saveFailed: "Couldn't save the goal.",
    deleted: "Goal deleted.",
    deleteFailed: "Couldn't delete the goal.",
    sessions: "Sessions",
    visitors: "Visitors",
    total: "Total",
    converted: "Converted",
    conversion: "Conversion rate",
    revenue: "Revenue",
    averageRevenue: "Average revenue",
    timeseries: "Conversion rate",
    updated: "Updated",
  },
  conversions: {
    new: "New",
    newGoal: "Goal",
    newGoalDescription: "One step, such as a signup",
    newFunnel: "Funnel",
    newFunnelDescription: "Several steps in order",
    empty: "No goals or funnels yet",
    emptyMemberHint: "An admin can create one.",
  },
  visitors: {},
  visitorDetail: {},
  retention: {},
  geo: {
    investigation: {
      typeLabels: {},
    },
  },
  devices: {
    dimensions: {},
    screenBucketLabels: {},
  },
  browsers: {},
  performance: {},
  share: {
    noData: "No data yet",
  },
  siteSettings: {
    title: "Site settings",
    sections: {
      basic: {
        title: "General",
      },
      tracking: {
        title: "Tracking",
      },
      blocking: {
        title: "Blocking rules",
      },
      protection: {
        title: "Bot blocking",
      },
      danger: {
        title: "Danger zone",
      },
      install: {
        title: "Install",
      },
      advanced: {
        title: "Advanced",
      },
    },
    nameLabel: "Name",
    domainLabel: "Domain",
    publicSharingTitle: "Sharing",
    publicEnabledLabel: "Public dashboard",
    publicSlugLabel: "Link path",
    publicSlugPlaceholder: "e.g. my-site",
    publicSlugHint: "The part of the link after /share/.",
    publicLinkLabel: "Public link",
    copiedLink: "Link copied",
    botProtectionEnabledLabel: "Block detected bots",
    botProtectionEnabledHint:
      "High-confidence bot requests are blocked when this is enabled; otherwise they remain included in statistics.",
    hostingProxyBlockingEnabledLabel: "Block hosting and proxy traffic",
    hostingProxyBlockingEnabledHint:
      "Block suspected bot requests from hosting or proxy networks.",
    trackQueryParamsLabel: "Track query parameters",
    trackHashLabel: "Track URL hash",
    blockingRulesSave: "Save rules",
    blockingRulesDialogs: {
      searchButton: "Search",
      searchTitle: "Search locations",
      searchDescription: "Search by name or code, then pick a result.",
      searchInputLabel: "Search",
      searchInputPlaceholder: "Search by name or code",
      searchCountryLabel: "Country / region",
      searchRegionLabel: "State / province",
      searchBack: "Change country / region",
      searchLoading: "Loading locations...",
      searchNoResults: "No matching locations.",
      searchLoadError: "Locations could not be loaded. Try again later.",
      searchClose: "Close",
    },
    blockingRulesFields: {
      domains: {
        title: "Domains",
        placeholder: "admin.example.com",
      },
      paths: {
        title: "Paths",
        placeholder: "/admin/*",
      },
      queryParameters: {
        title: "Query parameters",
        placeholder: "utm_source=spam",
      },
      referrers: {
        title: "Referrers",
        placeholder: "*.spam.example",
      },
      userAgents: {
        title: "User agents",
        placeholder: "*bot*",
      },
      ips: {
        title: "IP addresses",
        placeholder: "203.0.113.0/24",
      },
      asns: {
        title: "ASNs",
        placeholder: "64500",
      },
      countries: {
        title: "Countries",
        placeholder: "DE",
      },
      regions: {
        title: "States / provinces",
        placeholder: "US-CA",
      },
    },
    ignoreDoNotTrackLabel: "Ignore Do Not Track",
    autoTrackOutboundLinksLabel: "Auto-track outbound link clicks",
    autoTrackOutboundLinksHint:
      "When enabled, clicking links to external domains automatically reports outbound_click events.",
    autoTrackFileDownloadsLabel: "Track file downloads",
    autoTrackFileDownloadsHint:
      "Clicking a link to a file (PDF, ZIP, CSV and other common types, or any link with a download attribute) reports a file_download event with the file's URL.",
    track404PagesLabel: "Track 404 pages",
    track404PagesHint:
      "A page served with a 404 status reports a page_not_found event with its path, in browsers that report the status.",
    save: "Save",
    saving: "Saving...",
    scriptHint: "Paste it before </head> on every page.",
    copyScript: "Copy script",
    copiedScript: "Script copied.",
    scriptUnavailable: "Script is currently unavailable.",
    deleteTitle: "Delete site",
    deleteSubtitle: "Deletes the site and all of its analytics data.",
    delete: "Delete site",
    deleting: "Deleting...",
    deleteConfirm:
      "Deletes the site and all of its analytics data. This can't be undone.",
    toasts: {
      saved: "Site settings saved.",
      saveFailed: "Couldn't save site settings.",
      scriptLoadFailed: "Couldn't load the script snippet.",
      settingsLoadFailed: "Couldn't load script settings.",
      settingsPropagationHint: "Changes take up to an hour to apply.",
      deleted: "Site deleted.",
      deleteFailed: "Couldn't delete the site.",
      invalidInput: "Enter a site name and a valid domain.",
    },
    publicEnabledHint: "Anyone with the link can view this site's reports.",
    blockingRulesHelp:
      "Requests that match a Block rule aren't counted. Allow makes an exception. When several rules of one type match, the last one wins. Use * as a wildcard.",
    blockingRuleTypeLabel: "Type",
    blockingRuleActionLabel: "Action",
    blockingRuleValueLabel: "Value",
    blockingRuleBlock: "Block",
    blockingRuleAllow: "Allow",
    blockingRuleAdd: "Add rule",
    blockingRuleRemove: "Remove rule",
    blockingRulesEmpty: "No blocking rules.",
    blockingRuleInvalid: "Enter a valid value for this type.",
    blockingRulesTooMany: "Too many {type} rules.",
  },
  accountSettings: {
    emailManagedByGateway: "Your email comes from your Every App account.",
    profileTitle: "Personal details",
    nicknameLabel: "Display name",
    nicknamePlaceholder: "Your name",
    emailLabel: "Email",
    profileSaved: "Personal details saved.",
    profileSaveFailed: "Couldn't save personal details.",
    timeZoneTitle: "Time zone",
    browserUnavailable: "Not detected",
    useBrowser: "Browser time zone ({zone})",
    saved: "Time zone saved.",
    saveFailed: "Couldn't save the time zone.",
    timeZoneLabel: "Reporting time zone",
    aiClientsTitle: "AI clients",
    aiClientsLabel: "Connect an AI client",
    aiClientsDescription:
      "Add this address to Claude, ChatGPT or Claude Code once. It signs you in through Every App and covers every app you can open, OpenAnalytics included.",
    aiClientsDocs: "How to connect",
  },
  notificationCenter: {
    title: "Notifications",
    empty: "Reports and alerts from notification rules arrive here.",
    loading: "Loading notifications",
    markRead: "Mark as read",
    markAllRead: "Mark all as read",
    loadFailed: "Couldn't load notifications.",
    markReadFailed: "Couldn't mark the notification as read.",
    markAllReadSuccess: "Notifications marked as read.",
    markAllReadFailed: "Couldn't mark notifications as read.",
    tabs: {
      all: "All",
      unread: "Unread",
    },
    severities: {
      info: "Info",
      success: "Success",
      warning: "Warning",
      critical: "Critical",
    },
    preferencesTitle: "Notification preferences",
    emailNotificationsLabel: "Email notifications",
    reportsUnreadLabel: "Unread badge for reports",
    alertsUnreadLabel: "Unread badge for alerts",
    preferencesSaveFailed: "Couldn't save notification preferences.",
    detailFields: {},
    noUnread: "No unread notifications.",
    emailFailed: "Email failed",
    emailSkipped: "No email went out: email isn't set up on this gateway.",
  },
  notificationEmail: {
    common: {
      brand: "OpenAnalytics",
      date: "Date",
      coreMetrics: "Core metrics",
      topPages: "Top pages",
      topReferrers: "Top referrers",
      views: "views",
      visitors: "visitors",
      sessions: "sessions",
      visits: "visits",
      viewsUnit: "views",
      direct: "Direct",
      window: "Window",
      currentValue: "Current value",
      previousValue: "Previous value",
      change: "Change",
      noPageData: "No page data yet.",
      noReferrerData: "No referrer data yet.",
      footer: "This email was sent by the OpenAnalytics notification system.",
      severity: {
        info: "Info",
        success: "Success",
        warning: "Warning",
        critical: "Critical",
      },
    },
    report: {
      subject: "{site} {periodLabel} traffic report",
      title: "{site} {periodLabel} traffic report",
      summary: "{date}: {visitors} visitors and {views} views.",
      periodLabels: {
        weekly: "weekly",
        monthly: "monthly",
      },
    },
    change: {
      subject: "{site} traffic change alert",
      title: "{site} traffic change alert",
      summary: "{metric} for {window} changed by {change}.",
      metric: "visitors",
      windows: {
        last_1h: "Last hour",
        last_24h: "Last 24 hours",
      },
    },
  },
  runtimeConfigError: {
    title: "Dashboard unavailable",
    heading: "This dashboard isn't available right now.",
    setupSummary: "Set up this deployment",
    setupCommand:
      "Set {name} to 32 or more random characters with this command, then reload this page.",
    generateHint: "Make one with {command}.",
    devSetup:
      "This app is running under {command}. Set {name} in {file}, then reload this page.",
    docsLabel: "Deployment guide",
  },
  login: {},
  accountLinks: {
    invite: {
      roles: {},
    },
    resetPassword: {},
  },
  empty: {},
  errorPage: {
    notFoundTitle: "We couldn't find that page",
    notFoundDescription:
      "The address may be incorrect, or the page may have moved.",
    errorTitle: "Something went wrong",
    errorDescription: "OpenAnalytics couldn't complete this request.",
    homeAction: "Return home",
    reportAction: "Report on GitHub",
  },
  actions: {
    switchToLight: "Light",
    switchToDark: "Dark",
  },
  teamSelect: {
    groups: {},
    cancel: "Cancel",
  },
  teamManagement: {
    stats: {},
    toasts: {},
    sites: {
      aggregateTitle: "Total visits",
      openAnalytics: "Open analytics",
      title: "All sites",
      pagesPerSession: "Pages / session",
      public: "Public",
      openPublic: "Open the public dashboard",
    },
    notifications: {
      empty: "No notification rules yet.",
      enabledCount: "{count} of {total} enabled.",
      loadingRules: "Loading notification rules",
      loadRulesFailed: "Couldn't load notification rules.",
      createRule: "Create rule",
      editRule: "Edit rule",
      dialogDescription:
        "Each rule goes to the member who creates it: to their inbox, and by email when they have email on.",
      sendScheduleSection: "Send time",
      conditionSection: "Conditions",
      nameLabel: "Name",
      siteLabel: "Site",
      chooseSite: "Choose site",
      ruleTypeLabel: "Rule type",
      scheduleLabel: "Schedule",
      timeLabel: "Time",
      timezoneLabel: "Time zone",
      dayLabel: "Day",
      dayOfMonthLabel: "Day of month",
      addCondition: "Add condition",
      removeCondition: "Remove",
      windowLabel: "Window",
      directionLabel: "Direction",
      percentLabel: "By at least (%)",
      alertCondition: "{direction} of {percent}% or more ({window})",
      directions: {
        spike: "Spike",
        drop: "Drop",
      },
      pleaseChooseSite: "Choose a site.",
      ruleCreated: "Rule created.",
      ruleUpdated: "Rule updated.",
      createRuleFailed: "Couldn't create the rule.",
      updateRuleFailed: "Couldn't update the rule.",
      deleteConfirm: 'Delete "{name}"?',
      ruleDeleted: "Rule deleted.",
      deleteRuleFailed: "Couldn't delete the rule.",
      actions: "Actions",
      edit: "Edit",
      enable: "Enable",
      disable: "Disable",
      delete: "Delete",
      saveRule: "Save rule",
      scheduleWeekly: "Weekly {day} {time}",
      scheduleMonthly: "Monthly day {day} {time}",
      defaultNames: {
        report: "{site} report",
        change: "{site} traffic alert",
      },
      columns: {
        name: "Name",
        type: "Type",
        condition: "Condition",
        status: "Status",
      },
      status: {
        enabled: "Enabled",
        disabled: "Disabled",
      },
      ruleTypes: {
        report: "Report",
        change: "Traffic alert",
      },
      ruleTypeDescriptions: {
        report: "Send a site overview on a schedule",
        change: "Notify when visitors spike or drop",
      },
      scheduleKinds: {
        weekly: "Weekly",
        monthly: "Monthly",
      },
      weekDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      windows: {
        last_1h: "Last hour",
        last_24h: "Last 24 hours",
      },
      addSiteFirst: "Add a site first.",
      deleteDescription: "This can't be undone.",
    },
    publicLinks: {
      copyLink: "Copy link",
      columns: {},
    },
    apiKeys: {
      status: {},
      scopes: {},
      scopeDescriptions: {},
      scopeGroups: {},
      columns: {},
    },
    settings: {},
    members: {
      inviteStatuses: {},
      columns: {},
      roleLabels: {},
    },
  },
  managementPages: {
    versionUpdates: {},
  },
  adminUsers: {
    columns: {},
  },
  adminSites: {
    createTitle: "Add site",
    name: "Name (optional)",
    domain: "Domain",
    create: "Add site",
    creating: "Adding...",
    createSuccess: "Site added.",
    createFailed: "Couldn't add the site. Try again.",
    invalidDomain: "Enter a domain, like example.com.",
    columns: {},
  },
  adminTeams: {
    columns: {},
  },
  requestObservation: {
    tabs: {},
    requestKindLabels: {},
    normalDetail: {},
  },
  systemSettings: {
    notificationEmailTitle: "Email notifications",
    emailGatewayNotReady:
      "Email isn't set up on this gateway. An admin sets the sender with {command} after setting up a sending domain.",
    emailSenderLabel: "Sender",
    retentionTitle: "Data retention",
    retentionDescription:
      "Configure how long notification messages and detailed analytics remain available. Notification changes affect new messages only; detailed analytics older than the new limit start being deleted within the hour.",
    notificationAttentionDaysLabel: "Warning and critical notifications (days)",
    notificationDefaultDaysLabel: "Other notifications (days)",
    analyticsDetailDaysLabel:
      "Page views and events (days; the Overview's daily totals and breakdowns are kept)",
    analyticsKeepForever: "Keep forever",
    retentionRangeHint: "Enter a whole number of days, 1 or more.",
    retentionSave: "Save retention settings",
    retentionSaving: "Saving...",
    retentionSaved: "Retention settings saved.",
    retentionSaveFailed: "Couldn't save retention settings.",
    enabledOn: "Enabled",
    enabledOff: "Disabled",
    cancel: "Cancel",
    retentionLowerTitle: "Delete older analytics?",
    retentionLowerDescription:
      "Page views and events older than {days} days start being deleted within the hour. The Overview's daily totals and breakdowns are kept; filtered views, goals and funnels lose those days. This can't be undone.",
    retentionLowerConfirm: "Save and delete",
  },
  loginForm: {},
  logoutAction: {},
  sidebarHeader: {
    everyApp: "Every App",
    backToEveryApp: "Back to Every App",
  },
  appNav: {
    appearance: "Appearance",
    mainNavigation: "Main navigation",
    toggleSidebar: "Toggle sidebar",
    sites: "Sites",
    allSites: "All sites",
    inbox: "Notifications",
    settings: "Settings",
    switchSite: "Switch site",
    siteSettings: "Site settings",
    addSite: "Add site",
  },
  teamEntry: {},
  getStarted: {
    title: "Get started",
    progress: "{done} of {total}",
    showSteps: "Show the steps",
    hideSteps: "Hide the steps",
    completed: "{count} completed",
    steps: {
      site: "Add your first site",
      tracking: "Add the script to your site",
      team: "Invite members",
      notifications: "Get reports by email",
      sharing: "Share a public dashboard",
    },
    noSitesTitle: "Add your first site",
    memberNoSitesTitle: "No sites yet",
    memberNoSitesDescription: "Ask an admin to add one.",
    addSite: "Add site",
    waitingTitle: "Waiting for the first page view",
    copy: "Copy",
    copied: "Copied",
  },
  settingsNav: {
    label: "Settings",
    system: "System",
    account: "Account",
    notifications: "Notification rules",
    cancel: "Cancel",
  },
} as AppMessages;

const DICTIONARIES: Record<Locale, AppMessages> = {
  en: enMessages,
};

export function getMessages(locale: Locale): AppMessages {
  return DICTIONARIES[locale];
}
