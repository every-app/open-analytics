// @generated from src/i18n/*.yaml by scripts/i18n-check.
import type { Locale } from "./config";

export interface AppMessages {
  appName: string;
  uiGallery: {
    categories: Record<string, never>;
  };
  navigation: {
    overview: string;
    realtime: string;
    pages: string;
    referrers: string;
    events: string;
    funnels: string;
    campaigns: string;
    visitors: string;
    retention: string;
    geo: string;
    devices: string;
    performance: string;
    settings: string;
  };
  common: {
    deviceLabels: {
      desktop: string;
      mobile: string;
      tablet: string;
    };
    timeRelativePair: string;
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
    entryPage: string;
    exitPage: string;
    referrer: string;
    event: string;
    location: string;
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
    organization: string;
    screenSize: string;
    loading: string;
    noData: string;
    loadFailed: string;
    retry: string;
    filteredEmpty: string;
    clearFilters: string;
    trend: string;
    unknown: string;
    site: string;
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
      rowsLabel: string;
      currentView: string;
      rawRows: string;
      fileNameLabel: string;
      download: string;
      empty: string;
    };
    tableColumns: {
      action: string;
      title: string;
      description: string;
      visible: string;
      required: string;
      reset: string;
      dragHint: string;
      close: string;
    };
    close: string;
    sitesFiltered: string;
    cumulativeTraffic: string;
    cumulativeEvents: string;
  };
  ranges: {
    today: string;
    yesterday: string;
    last7d: string;
    last30d: string;
    last90d: string;
    last12m: string;
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
    nextPeriod: string;
    customSelectionSummary: string;
  };
  filters: {
    clear: string;
  };
  conditionDescription: {
    and: string;
    or: string;
    not: string;
    emptyConditions: string;
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
    userId: string;
    userName: string;
    isEU: string;
    queryString: string;
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
    utmTerm: string;
    utmContent: string;
    browserVersion: string;
    osVersion: string;
    userAgent: string;
    postalCode: string;
    metroCode: string;
    status: string;
    visibilityState: string;
    endedAt: string;
    duration: string;
    durationSource: string;
    exitReason: string;
    leaveAt: string;
  };
  overview: {
    title: string;
    trendTitle: string;
    sourceTab: string;
    sourceDomainColumn: string;
    sourceLinkTab: string;
    sourceLinkColumn: string;
    channelTab: string;
    channelColumn: string;
    direct: string;
    channelLabels: {
      direct: string;
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
    title: string;
    pagesPerSession: string;
    changePercentColumnLabel: string;
    changePointsColumnLabel: string;
    percentagePointSuffix: string;
    untitled: string;
    empty: string;
    loadMoreError: string;
    trendTitle: string;
    otherPages: string;
    hashTab: string;
    noHash: string;
    queryTab: string;
    noQuery: string;
    eventTab: string;
    eventsMetric: string;
    viewDetails: string;
  };
  referrers: {
    title: string;
    splitTitle: string;
    breakdownTitle: string;
    externalLabel: string;
    longTail: string;
    channelLongTail: string;
  };
  campaigns: {
    title: string;
    tabSource: string;
    tabMedium: string;
    tabCampaign: string;
    tabTerm: string;
    tabContent: string;
    notSet: string;
    noTaggedTraffic: string;
    taggedLinkHint: string;
  };
  sessions: {
    title: string;
    search: string;
    started: string;
    sessionId: string;
    visitor: string;
    anonymous: string;
    entryPage: string;
    exitPage: string;
    duration: string;
    referrer: string;
    location: string;
    os: string;
    browser: string;
    device: string;
    pageViews: string;
    customEvents: string;
    screenSize: string;
    exitTime: string;
    loadError: string;
    empty: string;
  };
  sessionDetail: {
    anonymous: string;
    userId: string;
    userName: string;
    back: string;
    missing: string;
    notFound: string;
    loadError: string;
    active: string;
    inactive: string;
    status: string;
    duration: string;
    screenViews: string;
    events: string;
    bounce: string;
    entryPath: string;
    exitPath: string;
    referrerName: string;
    os: string;
    browser: string;
    device: string;
    screen: string;
    yes: string;
    no: string;
    uniquePages: string;
    firstEvent: string;
    lastEvent: string;
    sessionStarted: string;
    pageview: string;
    exitPage: string;
    customEvent: string;
    eventTitleSeparator: string;
    visitDetailsTitle: string;
    visitDetailsSubtitle: string;
    location: string;
    visitorId: string;
    sessionId: string;
    referrerUrl: string;
    emptyEvents: string;
    emptyCustomEvents: string;
    sincePrevious: string;
    geoLocationTitle: string;
    performanceTitle: string;
    range: string;
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
    conversionRecords: string;
    open: string;
    moreActions: string;
    createTitle: string;
    nameLabel: string;
    namePlaceholder: string;
    filter: string;
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
  visitors: {
    title: string;
    search: string;
    visitor: string;
    anonymous: string;
    referrer: string;
    location: string;
    os: string;
    browser: string;
    device: string;
    firstSeen: string;
    lastSeen: string;
    pageViews: string;
    sessions: string;
    customEvents: string;
    screenSize: string;
    loadError: string;
    empty: string;
  };
  visitorDetail: {
    anonymous: string;
    userId: string;
    userName: string;
    back: string;
    missing: string;
    notFound: string;
    loadError: string;
    totalDuration: string;
    events: string;
    views: string;
    uniquePages: string;
    avgPagesPerSession: string;
    avgEventsPerSession: string;
    avgStay: string;
    firstSeen: string;
    lastSeen: string;
    daysActive: string;
    avgTimeBetweenSessions: string;
    activity: string;
    sessionRecords: string;
    started: string;
    visitor: string;
    duration: string;
    referrer: string;
    pageViews: string;
    visitDetailsTitle: string;
    visitDetailsSubtitle: string;
    customEvents: string;
    emptyEvents: string;
    emptyCustomEvents: string;
    emptySessions: string;
    visitorId: string;
    sessionId: string;
    referrerName: string;
    referrerUrl: string;
    location: string;
    browser: string;
    os: string;
    device: string;
    screen: string;
    entryPath: string;
    exitPath: string;
    sessionStarted: string;
    pageview: string;
    exitPage: string;
    customEvent: string;
    eventTitleSeparator: string;
    sincePrevious: string;
    geoLocationTitle: string;
    performanceTitle: string;
    range: string;
  };
  retention: {
    title: string;
    cohortBy: string;
    cohortDate: string;
    cohortSize: string;
    periodLabel: string;
    matrixTitle: string;
    matrixSubtitle: string;
    cohortsMetric: string;
    visitorsMetric: string;
    periodOneMetric: string;
    averageReturnMetric: string;
    strongestCohortMetric: string;
    eligibleVisitors: string;
    periodsAnalyzed: string;
    noEligibleCohorts: string;
    overallRetention: string;
    legendLow: string;
    legendHigh: string;
    periodZero: string;
    empty: string;
    emptyHint: string;
    loadError: string;
    unavailableCell: string;
    visitorsDetail: string;
    rateDetail: string;
    sizeDetail: string;
  };
  geo: {
    title: string;
    mapTitle: string;
    countryLabel: string;
    regionLabel: string;
    cityLabel: string;
    back: string;
    viewOnWikipedia: string;
    investigationNotice: string;
    timezoneDeltaVsLocal: string;
    visitorCoordinates: string;
    ipNotice: string;
    multipleNotice: string;
    investigation: {
      countryScopedLabel: string;
      capital: string;
      population: string;
      gdp: string;
      gdpPerCapita: string;
      marketPenetration: string;
      region: string;
      currency: string;
      phonecode: string;
      timezone: string;
      type: string;
      iso: string;
      coordinates: string;
      unavailable: string;
      gdpValue: string;
      gdpPerCapitaValue: string;
      gdpPerCapitaNearAverage: string;
      gdpPerCapitaAboveAverage: string;
      gdpPerCapitaBelowAverage: string;
      marketPenetrationWindow: string;
      timezoneCount: string;
      typeLabels: Record<string, string>;
    };
  };
  devices: {
    title: string;
    shareTitle: string;
    dimensions: {
      device: string;
      os: string;
      browser: string;
      engine: string;
      screenSize: string;
    };
    crossTabTitle: string;
    crossTabRows: string;
    crossTabColumns: string;
    otherLabel: string;
    screenBucketLabels: Record<string, never>;
  };
  browsers: {
    otherLabel: string;
  };
  performance: {
    title: string;
    empty: string;
    chartTitle: string;
    avgLabel: string;
    samplesLabel: string;
    p50Label: string;
    p75Label: string;
    p95Label: string;
    ttfb: string;
    fcp: string;
    lcp: string;
    cls: string;
    inp: string;
    ttfbDescription: string;
    fcpDescription: string;
    lcpDescription: string;
    clsDescription: string;
    inpDescription: string;
    msUnit: string;
    secondsUnit: string;
    clsUnit: string;
    score: string;
    scoreDescription: string;
    great: string;
    needsImprovement: string;
    poor: string;
    datasetTitle: string;
    interpretationTitle: string;
    currentReading: string;
    metricThresholdText: string;
    scoreThresholdText: string;
    countryHealthTitle: string;
    countryHealthSubtitle: string;
    pathsTitle: string;
    pathsAnalyzedLabel: string;
    metricValueColumn: string;
    statusColumn: string;
  };
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
    trackingStrengthGroupTitle: string;
    trackingStrengthStrong: string;
    trackingStrengthSmart: string;
    trackingStrengthWeak: string;
    trackingStrengthStrongDescription: string;
    trackingStrengthSmartDescription: string;
    trackingStrengthWeakDescription: string;
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
    performanceSampleRateLabel: string;
    performanceSampleRateHint: string;
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
    viewBlockedRequests: string;
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
    languageSaveFailed: string;
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
    milestonesUnreadLabel: string;
    alertsUnreadLabel: string;
    preferencesSaveFailed: string;
    detailFields: Record<string, never>;
    noUnread: string;
    emailFailed: string;
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
      metric: string;
      window: string;
      currentValue: string;
      previousValue: string;
      threshold: string;
      milestone: string;
      change: string;
      mode: string;
      lastSeen: string;
      never: string;
      noPageData: string;
      noReferrerData: string;
      footer: string;
      fallbackSubject: string;
      trackingHint: string;
      severity: {
        info: string;
        success: string;
        warning: string;
        critical: string;
      };
    };
    test: {
      subject: string;
      title: string;
      summary: string;
      body: string;
    };
    report: {
      subject: string;
      title: string;
      summary: string;
      periodLabels: {
        daily: string;
        weekly: string;
        monthly: string;
        quarterly: string;
        yearly: string;
      };
    };
    milestone: {
      subject: string;
      title: string;
      summary: string;
    };
    threshold: {
      subject: string;
      title: string;
      summary: string;
      metricLabels: {
        views: string;
        visitors: string;
        sessions: string;
      };
      windows: {
        last_1h: string;
        last_24h: string;
        yesterday: string;
      };
    };
    health: {
      subject: string;
      title: string;
      noHistory: string;
    };
    change: {
      subject: string;
      title: string;
      summary: string;
    };
  };
  runtimeConfigError: {
    title: string;
    heading: string;
    setupSummary: string;
    setupCommand: string;
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
    switchToEnglish: string;
    switchToChinese: string;
    switchToTraditionalChinese: string;
    switchToJapanese: string;
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
    widgets: Record<string, never>;
    notifications: {
      empty: string;
      rulesTitle: string;
      enabledCount: string;
      loadingRules: string;
      deliveryTestTitle: string;
      deliveryTestDescription: string;
      inAppTestHint: string;
      emailTestConfiguredHint: string;
      emailTestUnconfiguredHint: string;
      sendTestNotification: string;
      loadRulesFailed: string;
      testNotificationSent: string;
      sendTestNotificationFailed: string;
      createRule: string;
      editRule: string;
      dialogDescription: string;
      ruleInfoSection: string;
      scheduleSection: string;
      sendScheduleSection: string;
      checkSection: string;
      conditionSection: string;
      deliverySection: string;
      summarySection: string;
      liveSummaryDescription: string;
      nameLabel: string;
      siteLabel: string;
      chooseSite: string;
      ruleTypeLabel: string;
      recipientLabel: string;
      enabledLabel: string;
      enabledHint: string;
      scheduleLabel: string;
      timeLabel: string;
      timezoneLabel: string;
      intervalLabel: string;
      dayLabel: string;
      dayOfMonthLabel: string;
      monthLabel: string;
      reportPeriodLabel: string;
      milestoneEveryLabel: string;
      matchLabel: string;
      matchAll: string;
      matchAny: string;
      changeValueLabel: string;
      changeModeLabel: string;
      changeModePercent: string;
      changeModeAbsolute: string;
      addCondition: string;
      removeCondition: string;
      conditionItemTitle: string;
      metricLabel: string;
      windowLabel: string;
      operatorLabel: string;
      valueLabel: string;
      cooldownLabel: string;
      cooldownDescription: string;
      noDataHoursLabel: string;
      pleaseChooseSite: string;
      pleaseChooseRecipients: string;
      ruleCreated: string;
      ruleUpdated: string;
      createRuleFailed: string;
      updateRuleFailed: string;
      deleteConfirm: string;
      ruleDeleted: string;
      deleteRuleFailed: string;
      lastChecked: string;
      actions: string;
      edit: string;
      enable: string;
      disable: string;
      delete: string;
      saveRule: string;
      preview: string;
      runNow: string;
      previewFailed: string;
      runFailed: string;
      runResultToast: string;
      previewDialogTitle: string;
      previewDialogDescription: string;
      coolingDownUntil: string;
      scheduleDaily: string;
      scheduleWeekly: string;
      scheduleMonthly: string;
      scheduleQuarterly: string;
      scheduleYearly: string;
      scheduleInterval: string;
      scheduleCustom: string;
      conditionReport: string;
      summaryWhenConditions: string;
      summaryWhenSingleCondition: string;
      summaryConditionThreshold: string;
      summaryConditionChange: string;
      summaryReportSchedule: string;
      summaryMilestoneCondition: string;
      summaryHealthCondition: string;
      defaultNames: {
        report: string;
        milestone: string;
        threshold: string;
        change: string;
        health: string;
      };
      columns: {
        name: string;
        type: string;
        site: string;
        recipient: string;
        schedule: string;
        condition: string;
        nextRun: string;
        status: string;
      };
      status: {
        enabled: string;
        disabled: string;
      };
      nextRunStates: {
        disabled: string;
        coolingDown: string;
        dueNow: string;
      };
      previewFields: {
        status: string;
        summary: string;
        title: string;
        htmlPreview: string;
        bodyText: string;
        createdAt: string;
        updatedAt: string;
        loadingContent: string;
        noHtmlPreview: string;
      };
      ruleTypes: {
        report: string;
        milestone: string;
        threshold: string;
        change: string;
        health: string;
        test: string;
      };
      ruleTypeDescriptions: {
        report: string;
        milestone: string;
        threshold: string;
        change: string;
        health: string;
      };
      recipientModes: {
        creator: string;
        team_admins: string;
        all_team_members: string;
        users: string;
      };
      recipientKindLabel: string;
      recipientPresetLabel: string;
      customRecipientsEmpty: string;
      noTeamMembers: string;
      recipientKinds: {
        preset: string;
        custom: string;
      };
      scheduleKinds: {
        daily: string;
        weekly: string;
        monthly: string;
        quarterly: string;
        yearly: string;
        interval: string;
      };
      reportPeriods: {
        daily: string;
        weekly: string;
        monthly: string;
        quarterly: string;
        yearly: string;
      };
      cooldownUnits: {
        minutes: string;
        hours: string;
        days: string;
      };
      intervalOptions: {
        every30Minutes: string;
        everyHour: string;
        every6Hours: string;
        every12Hours: string;
        everyDay: string;
        every7Days: string;
        every30Days: string;
      };
      weekDays: string[];
      metrics: {
        views: string;
        visitors: string;
        sessions: string;
      };
      windows: {
        last_1h: string;
        last_24h: string;
        yesterday: string;
      };
      addSiteFirst: string;
      deleteDescription: string;
      previewStatuses: {
        skipped: string;
        checked: string;
        triggered: string;
      };
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
    scheduledTasks: {
      empty: string;
      refresh: string;
      loadFailed: string;
      loadMore: string;
      allStatuses: string;
      runs24h: string;
      successRate24h: string;
      problemRuns24h: string;
      failed: string;
      partial: string;
      lastRun: string;
      staleRunning: string;
      taskListTitle: string;
      task: string;
      schedule: string;
      enabled: string;
      enabledYes: string;
      enabledNo: string;
      taskStateSaved: string;
      taskStateSaveFailed: string;
      lastStatus: string;
      runs30d: string;
      successRate30d: string;
      avgDuration: string;
      runHistoryTitle: string;
      nextRun: string;
      noRuns: string;
      scheduledAt: string;
      startedAt: string;
      finishedAt: string;
      trigger: string;
      tasks: string;
      taskCount: string;
      subtaskCount: string;
      taskResult: string;
      statusLabel: string;
      duration: string;
      sites: string;
      hours: string;
      rows: string;
      rulesScanned: string;
      messagesCreated: string;
      emailFailed: string;
      logs: string;
      viewLogs: string;
      logTitle: string;
      noRunSelected: string;
      noLogs: string;
      error: string;
      status: {
        running: string;
        success: string;
        partial: string;
        failed: string;
        skipped: string;
      };
      taskDefinitions: {
        visit_hourly_rollup: {
          name: string;
          description: string;
          schedule: string;
        };
        notification_tick: {
          name: string;
          description: string;
          schedule: string;
        };
        database_maintenance: {
          name: string;
          description: string;
          schedule: string;
        };
      };
      keptForDays: string;
    };
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
    blockedTotal: string;
    retentionNote: string;
    topReasons: string;
    recentTitle: string;
    categoryLabels: {
      custom_block: string;
      bot: string;
      suspected_bot: string;
    };
    tabs: Record<string, never>;
    refresh: string;
    loadFailed: string;
    noData: string;
    time: string;
    site: string;
    location: string;
    network: string;
    reason: string;
    userAgent: string;
    emptyValue: string;
    pathname: string;
    country: string;
    ipPrefix: string;
    botReasonLabels: {
      missing_ua: string;
      ua_too_long: string;
      ua_isbot: string;
      script_ua: string;
      cf_bot_score_low: string;
      cf_verified_bot_category: string;
      hosting_asn: string;
      network_service_asn: string;
      transit_asn: string;
      access_asn: string;
      missing_browser_provenance: string;
      origin_hostname_mismatch: string;
      custom_block: string;
      blocked_domains: string;
      blocked_paths: string;
      blocked_query_parameters: string;
      blocked_referrers: string;
      blocked_user_agents: string;
      blocked_ips: string;
      blocked_asns: string;
      blocked_countries: string;
      blocked_regions: string;
    };
    requestKindLabels: Record<string, never>;
    overviewLabels: {
      windowDays: string;
    };
    normalDetail: Record<string, never>;
  };
  systemSettings: {
    notificationEmailTitle: string;
    emailGatewayNotReady: string;
    emailSenderLabel: string;
    retentionTitle: string;
    retentionDescription: string;
    scheduledTaskLogsDaysLabel: string;
    notificationTestDaysLabel: string;
    notificationAttentionDaysLabel: string;
    notificationDefaultDaysLabel: string;
    analyticsDetailDaysLabel: string;
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
  systemPerformance: {
    refresh: string;
    loadFailed: string;
    noData: string;
    range15m: string;
    range1h: string;
    range6h: string;
    range24h: string;
    totalEvents: string;
    p95Latency: string;
    p50Latency: string;
    p75Latency: string;
    p50Label: string;
    p75Label: string;
    p95Label: string;
    dataFreshness: string;
    noRecentWrite: string;
    clockAnomalies: string;
    delayed: string;
    future: string;
    latencyPercentileTrend: string;
    latencyPercentileTrendDescription: string;
    throughputTrend: string;
    throughputTrendDescription: string;
    visits: string;
    customEvents: string;
    anomalyBucket: string;
    openVisitHealth: string;
    openVisitHealthDescription: string;
    open: string;
    stale: string;
    timedOut: string;
    oldestOpen: string;
    latestActivity: string;
    latencySampleHealth: string;
    latencySampleHealthDescription: string;
    trustedSamples: string;
    topSitesTitle: string;
    topSitesDescription: string;
    events: string;
    avgLatency: string;
    slowestEventsTitle: string;
    slowestEventsDescription: string;
    eventTime: string;
    serverTime: string;
    estimatedDelay: string;
    doDiagnosticTitle: string;
    doDiagnosticDescription: string;
    doDiagnosticLoadFailed: string;
    doDiagnosticLoading: string;
    doDiagnosticRun: string;
    doDiagnosticEmpty: string;
    doDiagnosticUnreachable: string;
    doDiagnosticReachableSites: string;
    doDiagnosticTotalSites: string;
    doDiagnosticActiveAlarms: string;
    doDiagnosticBufferedVisits: string;
    doDiagnosticOpenVisits: string;
    doDiagnosticOpenStale: string;
    doDiagnosticOpenTimedOut: string;
    doDiagnosticOpenHardAged: string;
    doDiagnosticOpenFutureSkew: string;
    doDiagnosticStuckDirty: string;
    doDiagnosticMaxFlushAttempts: string;
    doDiagnosticBufferedCustomEvents: string;
    doDiagnosticOldestOpen: string;
    doDiagnosticFutureMaxActivity: string;
    doDiagnosticSiteList: string;
    doDiagnosticSiteListDescription: string;
    doDiagnosticSiteFailed: string;
    doDiagnosticSiteOpen: string;
    doDiagnosticSiteStuck: string;
    doDiagnosticSiteFuture: string;
    doDiagnosticSiteHardAged: string;
    doDiagnosticSiteAlarm: string;
    doDiagnosticSiteAlarmNone: string;
    doDiagnosticSiteAlarmDue: string;
    doDiagnosticSiteNextDue: string;
    doDiagnosticSiteNextDueFlush: string;
    doDiagnosticSiteNextDueHidden: string;
    doDiagnosticSiteNextDueTimeout: string;
    doDiagnosticSiteResponseMs: string;
    doDiagnosticHealthy: string;
  };
  loginForm: Record<string, never>;
  logoutAction: Record<string, never>;
  sidebarFooter: {
    gateway: string;
  };
  appNav: {
    appearance: string;
    mainNavigation: string;
    toggleSidebar: string;
    sources: string;
    audience: string;
    goals: string;
    sites: string;
    allSites: string;
    inbox: string;
    settings: string;
    switchSite: string;
    siteSettings: string;
    addSite: string;
    sections: string;
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
  systemHealth: {
    tabs: {
      tasks: string;
      blocked: string;
      ingestion: string;
      data: string;
    };
  };
}

const enMessages = {
  appName: "OpenAnalytics",
  uiGallery: {
    categories: {},
  },
  navigation: {
    overview: "Overview",
    realtime: "Real-time",
    pages: "Pages",
    referrers: "Referrers",
    events: "Events",
    funnels: "Goals & funnels",
    campaigns: "Campaigns",
    visitors: "Visitors",
    retention: "Retention",
    geo: "Location",
    devices: "Devices",
    performance: "Performance",
    settings: "Site settings",
  },
  common: {
    deviceLabels: {
      desktop: "Desktop",
      mobile: "Mobile",
      tablet: "Tablet",
    },
    timeRelativePair: "{absolute} ({relative})",
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
    entryPage: "Entry page",
    exitPage: "Exit page",
    referrer: "Referrer",
    event: "Event",
    location: "Location",
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
    organization: "Network organization",
    screenSize: "Screen size",
    loading: "Loading",
    noData: "No data",
    loadFailed: "Couldn't load",
    retry: "Retry",
    filteredEmpty: "Nothing matches these filters",
    clearFilters: "Clear filters",
    trend: "Trend",
    unknown: "Unknown",
    site: "Site",
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
      description: "Download table data as a CSV file.",
      scopeLabel: "Scope",
      currentTab: "Current tab",
      allTabs: "All tabs",
      rowsLabel: "Data",
      currentView: "Current displayed data",
      rawRows: "Original data",
      fileNameLabel: "File name",
      download: "Export CSV",
      empty: "No rows available to export.",
    },
    tableColumns: {
      action: "Columns",
      title: "Configure columns",
      description: "Choose which columns to show and drag to reorder them.",
      visible: "Visible columns",
      required: "Required",
      reset: "Reset to default",
      dragHint: "Drag to reorder",
      close: "Close",
    },
    close: "Close",
    sitesFiltered: "{active} / {total} sites filtered",
    cumulativeTraffic: "Cumulative traffic",
    cumulativeEvents: "Cumulative events",
  },
  ranges: {
    today: "Today",
    yesterday: "Yesterday",
    last7d: "Last 7 days",
    last30d: "Last 30 days",
    last90d: "Last 90 days",
    last12m: "Last 12 months",
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
    nextPeriod: "Next period",
    customSelectionSummary: "Selected range: {from} to {to} ({days} days)",
  },
  filters: {
    clear: "Clear",
  },
  conditionDescription: {
    and: "and",
    or: "or",
    not: "not ({description})",
    emptyConditions: "No conditions",
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
      "geo.organization": "Network organization",
      "event.collection": "Event collection",
      "event.name": "Event name",
      "event.payload": "Event properties",
      "page.durationMs": "Time on page",
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
    userId: "User ID",
    userName: "User name",
    isEU: "EU visitor",
    queryString: "Query string",
    utmSource: "UTM source",
    utmMedium: "UTM medium",
    utmCampaign: "UTM campaign",
    utmTerm: "UTM term",
    utmContent: "UTM content",
    browserVersion: "Browser version",
    osVersion: "OS version",
    userAgent: "User agent",
    postalCode: "Postal code",
    metroCode: "Metro code",
    status: "Status",
    visibilityState: "Visibility state",
    endedAt: "Ended at",
    duration: "Duration",
    durationSource: "Duration source",
    exitReason: "Exit reason",
    leaveAt: "Left at",
  },
  overview: {
    title: "Overview",
    trendTitle: "Traffic trend",
    sourceTab: "Source",
    sourceDomainColumn: "Source (domain)",
    sourceLinkTab: "Source link",
    sourceLinkColumn: "Source link",
    channelTab: "Channel",
    channelColumn: "Channel",
    direct: "Direct",
    channelLabels: {
      direct: "Direct",
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
    firstViewsTitle: "Your first page views are in!",
    nextReports: "Get reports by email",
    nextInvite: "Invite members",
    dismiss: "Dismiss",
  },
  pages: {
    title: "Pages",
    pagesPerSession: "Pages / session",
    changePercentColumnLabel: "{metric} change (%)",
    changePointsColumnLabel: "{metric} change (pp)",
    percentagePointSuffix: "pp",
    untitled: "Untitled page",
    empty: "No pages yet",
    loadMoreError: "Failed to load more pages.",
    trendTitle: "Page traffic trend",
    otherPages: "Other pages",
    hashTab: "Anchor",
    noHash: "No anchor",
    queryTab: "Query parameters",
    noQuery: "No query parameters",
    eventTab: "Events",
    eventsMetric: "Event count",
    viewDetails: "View details",
  },
  referrers: {
    title: "Referrers",
    splitTitle: "Traffic split",
    breakdownTitle: "Source breakdown",
    externalLabel: "External",
    longTail: "Long tail",
    channelLongTail: "Other channels",
  },
  campaigns: {
    title: "Campaigns",
    tabSource: "UTM source",
    tabMedium: "Medium",
    tabCampaign: "Campaign",
    tabTerm: "Term",
    tabContent: "Content",
    notSet: "Not set",
    noTaggedTraffic: "No UTM-tagged visits in this period",
    taggedLinkHint: "Add UTM tags to your links, for example",
  },
  sessions: {
    title: "Sessions",
    search: "Search sessions...",
    started: "Start time",
    sessionId: "Session ID",
    visitor: "Visitor",
    anonymous: "Anonymous",
    entryPage: "Entry page",
    exitPage: "Exit page",
    duration: "Duration",
    referrer: "Referrer",
    location: "Location",
    os: "OS",
    browser: "Browser",
    device: "Device",
    pageViews: "Page views",
    customEvents: "Custom events",
    screenSize: "Screen size",
    exitTime: "Exit time",
    loadError: "Unable to load sessions.",
    empty: "No sessions in this time range.",
  },
  sessionDetail: {
    anonymous: "Anonymous",
    userId: "User ID",
    userName: "User name",
    back: "Back to sessions",
    missing: "Missing sessionId.",
    notFound: "Session not found.",
    loadError: "Unable to load session detail.",
    active: "Active",
    inactive: "Ended",
    status: "Status",
    duration: "Duration",
    screenViews: "Page views",
    events: "Events",
    bounce: "Bounced",
    entryPath: "Entry path",
    exitPath: "Exit path",
    referrerName: "Referrer name",
    os: "OS",
    browser: "Browser",
    device: "Device",
    screen: "Screen",
    yes: "Yes",
    no: "No",
    uniquePages: "Unique pages",
    firstEvent: "First event",
    lastEvent: "Last event",
    sessionStarted: "Session started",
    pageview: "Page view",
    exitPage: "Exit page",
    customEvent: "Custom event",
    eventTitleSeparator: ": ",
    visitDetailsTitle: "Visit details",
    visitDetailsSubtitle:
      "Session start, page views, exits, and custom events in the order they happened.",
    location: "Location",
    visitorId: "Visitor ID",
    sessionId: "Session ID",
    referrerUrl: "Referrer URL",
    emptyEvents: "No events recorded.",
    emptyCustomEvents: "No custom events.",
    sincePrevious: "Since previous",
    geoLocationTitle: "Location",
    performanceTitle: "Current session performance",
    range: "Range",
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
      "Unable to parse the filter conditions. Check the field path, operator, and value.",
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
    copyJsonFailed: "Unable to copy JSON.",
    copyValue: "Copy value",
    copiedValue: "Value copied.",
    copyValueFailed: "Failed to copy value.",
    loadError: "Unable to load event data.",
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
    detailLoadError: "Unable to load funnel analysis.",
    invalidFunnel: "Add a name and at least two complete filters.",
    created: "Funnel created.",
    createFailed: "Unable to create funnel.",
    updatedSuccess: "Funnel updated.",
    saveFailed: "Unable to save funnel.",
    deleted: "Funnel deleted.",
    deleteFailed: "Unable to delete funnel.",
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
    conversionRecords: "Conversion records",
    open: "Open goal",
    moreActions: "More actions",
    createTitle: "Create goal",
    nameLabel: "Name",
    namePlaceholder: "Purchase completed",
    filter: "Conversion condition",
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
    detailLoadError: "Unable to load goal analysis.",
    invalidGoal: "Add a name and a complete conversion condition.",
    created: "Goal created.",
    updatedSuccess: "Goal updated.",
    saveFailed: "Unable to save goal.",
    deleted: "Goal deleted.",
    deleteFailed: "Unable to delete goal.",
    sessions: "Sessions",
    visitors: "Visitors",
    total: "Total",
    converted: "Converted",
    conversion: "Conversion rate",
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
  visitors: {
    title: "Visitors",
    search: "Search visitors...",
    visitor: "Visitor",
    anonymous: "Anonymous",
    referrer: "Referrer",
    location: "Location",
    os: "OS",
    browser: "Browser",
    device: "Device",
    firstSeen: "First visit",
    lastSeen: "Last visit",
    pageViews: "Page views",
    sessions: "Sessions",
    customEvents: "Custom events",
    screenSize: "Screen size",
    loadError: "Unable to load visitors.",
    empty: "No visitors in this time range.",
  },
  visitorDetail: {
    anonymous: "Anonymous",
    userId: "User ID",
    userName: "User name",
    back: "Back to visitors",
    missing: "Missing visitorId.",
    notFound: "Visitor not found.",
    loadError: "Unable to load visitor detail.",
    totalDuration: "Total duration",
    events: "Events",
    views: "Page views",
    uniquePages: "Unique pages",
    avgPagesPerSession: "Avg. pages / session",
    avgEventsPerSession: "Avg. events / session",
    avgStay: "Avg. visit duration",
    firstSeen: "First visit",
    lastSeen: "Last visit",
    daysActive: "Days active",
    avgTimeBetweenSessions: "Avg. time between sessions",
    activity: "Activity",
    sessionRecords: "Session records",
    started: "Start time",
    visitor: "Visitor",
    duration: "Duration",
    referrer: "Referrer",
    pageViews: "Page views",
    visitDetailsTitle: "Visit details",
    visitDetailsSubtitle:
      "Session starts, page views, exits, and custom events for this visitor in the order they happened.",
    customEvents: "Custom events",
    emptyEvents: "No events recorded.",
    emptyCustomEvents: "No custom events.",
    emptySessions: "No sessions recorded.",
    visitorId: "Visitor ID",
    sessionId: "Session ID",
    referrerName: "Referrer name",
    referrerUrl: "Referrer URL",
    location: "Location",
    browser: "Browser",
    os: "OS",
    device: "Device",
    screen: "Screen",
    entryPath: "Entry path",
    exitPath: "Exit path",
    sessionStarted: "Session started",
    pageview: "Page view",
    exitPage: "Exit page",
    customEvent: "Custom event",
    eventTitleSeparator: ": ",
    sincePrevious: "Since previous",
    geoLocationTitle: "Location",
    performanceTitle: "Current visitor performance",
    range: "Range",
  },
  retention: {
    title: "Retention",
    cohortBy: "Cohort by: {interval}",
    cohortDate: "Cohort date",
    cohortSize: "Cohort size",
    periodLabel: "Period {n}",
    matrixTitle: "Retention matrix",
    matrixSubtitle:
      "Each row is a first-seen cohort; each column shows the share that returned in a later period.",
    cohortsMetric: "Cohorts",
    visitorsMetric: "Cohort visitors",
    periodOneMetric: "First return",
    averageReturnMetric: "Average return",
    strongestCohortMetric: "Best cohort",
    eligibleVisitors: "Eligible visitors",
    periodsAnalyzed: "Periods analyzed",
    noEligibleCohorts: "No eligible cohorts",
    overallRetention: "Overall retention",
    legendLow: "Low",
    legendHigh: "High",
    periodZero: "Initial",
    empty: "Not enough return data in this time range.",
    emptyHint: "Pick a longer period, or a coarser interval, in the date menu.",
    loadError: "Unable to load retention data.",
    unavailableCell: "This cohort has not reached this period yet.",
    visitorsDetail: "Visitors",
    rateDetail: "Retention",
    sizeDetail: "Cohort size",
  },
  geo: {
    title: "Location",
    mapTitle: "Visitors by location",
    countryLabel: "Country / region",
    regionLabel: "Region",
    cityLabel: "City",
    back: "Back",
    viewOnWikipedia: "View on Wikipedia",
    investigationNotice: "This data comes from the web and may contain errors.",
    timezoneDeltaVsLocal: "Difference from local time: {delta}",
    visitorCoordinates: "Visitor coordinates",
    ipNotice:
      "Estimated location via IP. Coordinates are approximate and do not pinpoint a precise address.",
    multipleNotice:
      "This visitor's journey across different sessions may span multiple cities.",
    investigation: {
      countryScopedLabel: "Country's {label}",
      capital: "Capital",
      population: "Population",
      gdp: "GDP",
      gdpPerCapita: "GDP per capita",
      marketPenetration: "Market penetration",
      region: "Region",
      currency: "Currency",
      phonecode: "Phone code",
      timezone: "Time zone",
      type: "Type",
      iso: "ISO",
      coordinates: "Coordinates",
      unavailable: "N/A",
      gdpValue: "{value} million USD",
      gdpPerCapitaValue: "{value} USD/person",
      gdpPerCapitaNearAverage: "{value} USD/person (near the world average)",
      gdpPerCapitaAboveAverage: "{value} USD/person ({percent}% above average)",
      gdpPerCapitaBelowAverage: "{value} USD/person ({percent}% below average)",
      marketPenetrationWindow: "{label} ({days} days)",
      timezoneCount: "{count} time zones",
      typeLabels: {
        country: "Country",
        state: "State",
        province: "Province",
        prefecture: "Prefecture",
        city: "City",
        county: "County",
        district: "District",
        town: "Town",
        village: "Village",
        municipality: "Municipality",
        territory: "Territory",
        section: "Section",
        adm1: "Admin level 1",
        adm2: "Admin level 2",
        adm3: "Admin level 3",
        adm4: "Admin level 4",
        adm5: "Admin level 5",
      },
    },
  },
  devices: {
    title: "Devices",
    shareTitle: "Visitor share",
    dimensions: {
      device: "Device",
      os: "OS",
      browser: "Browser",
      engine: "Engine",
      screenSize: "Screen size",
    },
    crossTabTitle: "Breakdown",
    crossTabRows: "Rows",
    crossTabColumns: "Split by",
    otherLabel: "Other",
    screenBucketLabels: {},
  },
  browsers: {
    otherLabel: "Other",
  },
  performance: {
    title: "Performance",
    empty: "No Web Vitals yet",
    chartTitle: "Performance trend",
    avgLabel: "Average",
    samplesLabel: "Samples",
    p50Label: "P50",
    p75Label: "P75",
    p95Label: "P95",
    ttfb: "Time to First Byte",
    fcp: "First Contentful Paint",
    lcp: "Largest Contentful Paint",
    cls: "Cumulative Layout Shift",
    inp: "Interaction to Next Paint",
    ttfbDescription:
      "Measures how long the browser waits before receiving the first byte from the server. It reflects backend latency, network delay, and cache effectiveness.",
    fcpDescription:
      "Measures when the first text or image is painted. It reflects how quickly visitors see that the page is starting to load.",
    lcpDescription:
      "Measures when the largest visible content element finishes rendering. It is the main loading speed signal for perceived page readiness.",
    clsDescription:
      "Measures unexpected layout movement during the page lifecycle. Lower values mean the page is visually stable.",
    inpDescription:
      "Measures the latency of user interactions before the next paint. It reflects how responsive the page feels after loading.",
    msUnit: "ms",
    secondsUnit: "s",
    clsUnit: "score",
    score: "Experience score",
    scoreDescription:
      "Combines P75 loading, stability, and interaction metrics into a 0 to 100 experience score. Higher is better.",
    great: "Great",
    needsImprovement: "Needs improvement",
    poor: "Poor",
    datasetTitle: "Thresholds",
    interpretationTitle: "Current reading",
    currentReading:
      "{metric} P75 is {value}, with an experience score of {score} across {samples} samples. Current status: {status}.",
    metricThresholdText:
      "Great: {good} or lower; needs improvement: {good} to {poor}; poor: above {poor}.",
    scoreThresholdText:
      "Great: above 90; needs improvement: 50 to 90; poor: below 50.",
    countryHealthTitle: "Country and region health",
    countryHealthSubtitle:
      "Boundary fill shows {metric} health by country or region.",
    pathsTitle: "Path performance",
    pathsAnalyzedLabel: "Paths analyzed",
    metricValueColumn: "P75 value",
    statusColumn: "Status",
  },
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
        title: "Protection",
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
    trackingStrengthGroupTitle: "Tracking strength",
    trackingStrengthStrong: "Strong",
    trackingStrengthSmart: "Smart",
    trackingStrengthWeak: "Weak",
    trackingStrengthStrongDescription:
      "Always use high-precision visitor tracking. This may conflict with privacy regulations such as GDPR in some regions.",
    trackingStrengthSmartDescription:
      "Automatically switch tracking strength based on the visitor's country.",
    trackingStrengthWeakDescription:
      "Always reduce tracking precision. This can count the same visitor multiple times across visits and make retention impossible.",
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
    performanceSampleRateLabel: "Web Vitals sample rate",
    performanceSampleRateHint:
      "A sampled visit records TTFB, FCP, LCP, CLS, and INP on leave. Use 0 to disable sampling or 100 for full coverage.",
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
    deleteConfirm: "This action cannot be undone. Continue?",
    toasts: {
      saved: "Site settings saved.",
      saveFailed: "Failed to save site settings.",
      scriptLoadFailed: "Failed to load script snippet.",
      settingsLoadFailed: "Failed to load script settings.",
      settingsPropagationHint: "Changes take up to an hour to apply.",
      deleted: "Site deleted.",
      deleteFailed: "Failed to delete site.",
      invalidInput: "Enter a site name and a valid domain.",
    },
    publicEnabledHint: "Anyone with the link can view this site's reports.",
    viewBlockedRequests: "See blocked requests",
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
    nicknamePlaceholder: "e.g. Product Analyst",
    emailLabel: "Email",
    profileSaved: "Personal details saved.",
    profileSaveFailed: "Failed to save personal details.",
    timeZoneTitle: "Time zone",
    browserUnavailable: "Not detected",
    useBrowser: "Browser time zone ({zone})",
    saved: "Time zone saved.",
    saveFailed: "Couldn't save the time zone.",
    timeZoneLabel: "Reporting time zone",
    languageSaveFailed: "Couldn't save your language.",
  },
  notificationCenter: {
    title: "Inbox",
    empty: "No notifications yet.",
    loading: "Loading notifications",
    markRead: "Mark read",
    markAllRead: "Mark all as read",
    loadFailed: "Failed to load notifications.",
    markReadFailed: "Failed to mark notification as read.",
    markAllReadSuccess: "Notifications marked as read.",
    markAllReadFailed: "Failed to mark notifications as read.",
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
    reportsUnreadLabel: "Mark new reports as unread",
    milestonesUnreadLabel: "Mark new milestones as unread",
    alertsUnreadLabel: "Mark new alerts as unread",
    preferencesSaveFailed: "Failed to save notification preferences.",
    detailFields: {},
    noUnread: "No unread notifications.",
    emailFailed: "Email failed",
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
      metric: "Metric",
      window: "Window",
      currentValue: "Current value",
      previousValue: "Previous value",
      threshold: "Threshold",
      milestone: "Milestone",
      change: "Change",
      mode: "Mode",
      lastSeen: "Last seen",
      never: "Never",
      noPageData: "No page data yet.",
      noReferrerData: "No referrer data yet.",
      footer: "This email was sent by the OpenAnalytics notification system.",
      fallbackSubject: "OpenAnalytics notification",
      trackingHint:
        "Check whether the tracking script is installed correctly or whether the site still has traffic.",
      severity: {
        info: "Info",
        success: "Success",
        warning: "Warning",
        critical: "Critical",
      },
    },
    test: {
      subject: "OpenAnalytics notification test",
      title: "OpenAnalytics notification test",
      summary: "This is a test notification from OpenAnalytics.",
      body: "This is a test notification from OpenAnalytics. If email is set up on the Every App gateway, it also checks email delivery.",
    },
    report: {
      subject: "{site} {periodLabel} traffic report",
      title: "{site} {periodLabel} traffic report",
      summary: "{date}: {visitors} visitors and {views} views.",
      periodLabels: {
        daily: "daily",
        weekly: "weekly",
        monthly: "monthly",
        quarterly: "quarterly",
        yearly: "yearly",
      },
    },
    milestone: {
      subject: "{site} reached {bucket} {metric}",
      title: "{site} reached {bucket} {metric}",
      summary: "Traffic milestone reached: {bucket} {metric}.",
    },
    threshold: {
      subject: "{site} traffic threshold reached",
      title: "{site} traffic threshold reached",
      summary:
        "{metric} for {window} is {value}, matching threshold {operator} {target}.",
      metricLabels: {
        views: "views",
        visitors: "visitors",
        sessions: "sessions",
      },
      windows: {
        last_1h: "Last hour",
        last_24h: "Last 24 hours",
        yesterday: "Yesterday",
      },
    },
    health: {
      subject: "{site} has not received traffic data for {hours} hours",
      title: "{site} has not received traffic data for {hours} hours",
      noHistory:
        "No historical traffic data is available. Check whether the tracking script is installed correctly.",
    },
    change: {
      subject: "{site} traffic change alert",
      title: "{site} traffic change alert",
      summary: "{metric} for {window} changed by {change}.",
    },
  },
  runtimeConfigError: {
    title: "Dashboard unavailable",
    heading: "This dashboard isn't available right now.",
    setupSummary: "Set up this deployment",
    setupCommand:
      "Set the root secret with this command, then reload this page.",
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
    switchToEnglish: "English",
    switchToChinese: "Simplified Chinese",
    switchToTraditionalChinese: "Traditional Chinese",
    switchToJapanese: "日本語",
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
    widgets: {},
    notifications: {
      empty: "No notification rules yet.",
      rulesTitle: "Notification rules",
      enabledCount: "{count} enabled rules in this organization.",
      loadingRules: "Loading notification rules",
      deliveryTestTitle: "Delivery test",
      deliveryTestDescription:
        "Creates one in-app notification for you and attempts email when available.",
      inAppTestHint: "We will send you an in-app notification.",
      emailTestConfiguredHint: "We will send you a test email.",
      emailTestUnconfiguredHint:
        "Email isn't set up on this Every App gateway.",
      sendTestNotification: "Send test notification",
      loadRulesFailed: "Failed to load notification rules.",
      testNotificationSent: "Test notification sent.",
      sendTestNotificationFailed: "Failed to send test notification.",
      createRule: "Create rule",
      editRule: "Edit rule",
      dialogDescription: "Set up a notification rule for this organization.",
      ruleInfoSection: "Rule info",
      scheduleSection: "Schedule",
      sendScheduleSection: "Send time",
      checkSection: "Check frequency",
      conditionSection: "Conditions",
      deliverySection: "Delivery",
      summarySection: "Summary",
      liveSummaryDescription: "Confirm how this rule will run.",
      nameLabel: "Name",
      siteLabel: "Site",
      chooseSite: "Choose site",
      ruleTypeLabel: "Rule type",
      recipientLabel: "Recipient",
      enabledLabel: "Enabled",
      enabledHint: "Run this rule",
      scheduleLabel: "Schedule",
      timeLabel: "Time",
      timezoneLabel: "Time zone",
      intervalLabel: "Interval",
      dayLabel: "Day",
      dayOfMonthLabel: "Day of month",
      monthLabel: "Month",
      reportPeriodLabel: "Report period",
      milestoneEveryLabel: "Every milestone",
      matchLabel: "Match",
      matchAll: "All",
      matchAny: "Any",
      changeValueLabel: "Change value",
      changeModeLabel: "Change mode",
      changeModePercent: "Percent",
      changeModeAbsolute: "Absolute",
      addCondition: "Add condition",
      removeCondition: "Remove",
      conditionItemTitle: "Condition {index}",
      metricLabel: "Metric",
      windowLabel: "Window",
      operatorLabel: "Operator",
      valueLabel: "Value",
      cooldownLabel: "Cooldown",
      cooldownDescription:
        "Notifications will not be sent again during this cooldown window.",
      noDataHoursLabel: "No data hours",
      pleaseChooseSite: "Choose a site.",
      pleaseChooseRecipients: "Choose at least one recipient.",
      ruleCreated: "Rule created.",
      ruleUpdated: "Rule updated.",
      createRuleFailed: "Failed to create rule.",
      updateRuleFailed: "Failed to update rule.",
      deleteConfirm: 'Delete "{name}"?',
      ruleDeleted: "Rule deleted.",
      deleteRuleFailed: "Failed to delete rule.",
      lastChecked: "Last checked",
      actions: "Actions",
      edit: "Edit",
      enable: "Enable",
      disable: "Disable",
      delete: "Delete",
      saveRule: "Save rule",
      preview: "Preview",
      runNow: "Run now",
      previewFailed: "Failed to preview rule.",
      runFailed: "Failed to run rule.",
      runResultToast:
        "Created {messages} messages. Email sent {sent}, failed {failed}.",
      previewDialogTitle: "Rule preview",
      previewDialogDescription:
        "Evaluate this rule without creating messages or sending email.",
      coolingDownUntil: "Cooling down until {time}",
      scheduleDaily: "Daily {time}",
      scheduleWeekly: "Weekly {day} {time}",
      scheduleMonthly: "Monthly day {day} {time}",
      scheduleQuarterly: "Quarterly day {day} {time}",
      scheduleYearly: "Yearly {month}/{day} {time}",
      scheduleInterval: "Every {minutes} min",
      scheduleCustom: "Custom",
      conditionReport: "{period} report",
      summaryWhenConditions:
        "When {combinator} of the following conditions match, send a {type} notification:",
      summaryWhenSingleCondition:
        "When this condition matches, send a {type} notification:",
      summaryConditionThreshold: "{window} {metric} {operator} {value}",
      summaryConditionChange:
        "{window} {metric} {mode} change {operator} {value}",
      summaryReportSchedule: "{period}: {schedule}",
      summaryMilestoneCondition: "{metric} reaches every {step}",
      summaryHealthCondition: "No data for {hours} hours",
      defaultNames: {
        report: "{site} daily report",
        milestone: "{site} traffic milestone",
        threshold: "{site} traffic threshold",
        change: "{site} traffic change",
        health: "{site} health check",
      },
      columns: {
        name: "Name",
        type: "Type",
        site: "Site",
        recipient: "Recipient",
        schedule: "Schedule",
        condition: "Condition",
        nextRun: "Next run",
        status: "Status",
      },
      status: {
        enabled: "Enabled",
        disabled: "Disabled",
      },
      nextRunStates: {
        disabled: "Disabled",
        coolingDown: "Cooling down",
        dueNow: "Due now",
      },
      previewFields: {
        status: "Status",
        summary: "Summary",
        title: "Title",
        htmlPreview: "HTML preview",
        bodyText: "Body text",
        createdAt: "Created at",
        updatedAt: "Updated at",
        loadingContent: "Loading evaluated report content",
        noHtmlPreview: "This preview has no HTML content.",
      },
      ruleTypes: {
        report: "Report",
        milestone: "Milestone",
        threshold: "Threshold",
        change: "Change",
        health: "Health",
        test: "Test",
      },
      ruleTypeDescriptions: {
        report: "Send a site overview on a schedule",
        milestone: "Notify when a metric reaches each step",
        threshold: "Notify when a metric crosses a limit",
        change: "Notify on period-over-period movement",
        health: "Notify when tracking goes quiet",
      },
      recipientModes: {
        creator: "Creator",
        team_admins: "Organization admins",
        all_team_members: "All members",
        users: "Selected users",
      },
      recipientKindLabel: "Recipient type",
      recipientPresetLabel: "Preset",
      customRecipientsEmpty: "No recipients selected",
      noTeamMembers: "No organization members yet.",
      recipientKinds: {
        preset: "Preset",
        custom: "Custom",
      },
      scheduleKinds: {
        daily: "Daily",
        weekly: "Weekly",
        monthly: "Monthly",
        quarterly: "Quarterly",
        yearly: "Yearly",
        interval: "Interval",
      },
      reportPeriods: {
        daily: "Daily report",
        weekly: "Weekly report",
        monthly: "Monthly report",
        quarterly: "Quarterly report",
        yearly: "Yearly report",
      },
      cooldownUnits: {
        minutes: "minutes",
        hours: "hours",
        days: "days",
      },
      intervalOptions: {
        every30Minutes: "Every 30 minutes",
        everyHour: "Every hour",
        every6Hours: "Every 6 hours",
        every12Hours: "Every 12 hours",
        everyDay: "Every day",
        every7Days: "Every 7 days",
        every30Days: "Every 30 days",
      },
      weekDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      metrics: {
        views: "Views",
        visitors: "Visitors",
        sessions: "Sessions",
      },
      windows: {
        last_1h: "Last hour",
        last_24h: "Last 24 hours",
        yesterday: "Yesterday",
      },
      addSiteFirst: "Add a site first.",
      deleteDescription: "This can't be undone.",
      previewStatuses: {
        skipped: "Skipped",
        checked: "Not triggered",
        triggered: "Triggered",
      },
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
    scheduledTasks: {
      empty: "No scheduled tasks yet.",
      refresh: "Refresh",
      loadFailed: "Failed to load scheduled tasks.",
      loadMore: "Load more",
      allStatuses: "All statuses",
      runs24h: "Runs (last 24 hours)",
      successRate24h: "Success rate (last 24 hours)",
      problemRuns24h: "Problematic runs",
      failed: "Failed",
      partial: "Partial",
      lastRun: "Last run",
      staleRunning: "Long-running unfinished runs",
      taskListTitle: "Tasks",
      task: "Task",
      schedule: "Schedule",
      enabled: "State",
      enabledYes: "Enabled",
      enabledNo: "Disabled",
      taskStateSaved: "Task state updated.",
      taskStateSaveFailed: "Failed to update task state.",
      lastStatus: "Last status",
      runs30d: "Runs (30 days)",
      successRate30d: "Success rate (30 days)",
      avgDuration: "Avg. duration",
      runHistoryTitle: "Run history",
      nextRun: "Next run",
      noRuns: "No runs yet.",
      scheduledAt: "Scheduled",
      startedAt: "Started",
      finishedAt: "Finished",
      trigger: "Trigger",
      tasks: "Tasks",
      taskCount: "Tasks",
      subtaskCount: "Subtasks",
      taskResult: "Task result",
      statusLabel: "Status",
      duration: "Duration",
      sites: "Sites",
      hours: "Hours",
      rows: "Rows",
      rulesScanned: "Rules",
      messagesCreated: "Messages",
      emailFailed: "Email failed",
      logs: "Logs",
      viewLogs: "View logs",
      logTitle: "Run logs",
      noRunSelected: "Select a run to inspect logs.",
      noLogs: "No logs for this run.",
      error: "Error",
      status: {
        running: "Running",
        success: "Success",
        partial: "Partial",
        failed: "Failed",
        skipped: "Skipped",
      },
      taskDefinitions: {
        visit_hourly_rollup: {
          name: "Hourly visit aggregation",
          description:
            "Rolls finished visits up into hourly totals for reports.",
          schedule: "Every hour",
        },
        notification_tick: {
          name: "Notification dispatch",
          description: "Evaluates notification rules and dispatches messages.",
          schedule: "Every 30 minutes",
        },
        database_maintenance: {
          name: "Database maintenance",
          description:
            "Removes expired task runs and notifications, and tunes the database.",
          schedule: "Every day",
        },
      },
      keptForDays: "Kept for {days} days",
    },
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
    blockedTotal: "Blocked requests",
    retentionNote:
      "Kept for 30 days. Allowed traffic is in each site's dashboards.",
    topReasons: "Reasons",
    recentTitle: "Latest blocked requests",
    categoryLabels: {
      custom_block: "Block rule",
      bot: "Bot",
      suspected_bot: "Hosting network",
    },
    tabs: {},
    refresh: "Refresh",
    loadFailed: "Couldn't load blocked requests.",
    noData: "No blocked requests in this period.",
    time: "Time",
    site: "Site",
    location: "Location",
    network: "Network",
    reason: "Reason",
    userAgent: "User agent",
    emptyValue: "Unknown",
    pathname: "Path",
    country: "Country / region",
    ipPrefix: "IP prefix",
    botReasonLabels: {
      missing_ua: "Missing user agent",
      ua_too_long: "User agent too long",
      ua_isbot: "User agent matches a bot",
      script_ua: "Script client user agent",
      cf_bot_score_low: "Low Cloudflare bot score",
      cf_verified_bot_category: "Cloudflare verified bot category",
      hosting_asn: "Hosting ASN",
      network_service_asn: "Network service ASN",
      transit_asn: "Transit ASN",
      access_asn: "Access ASN",
      missing_browser_provenance: "Missing browser provenance",
      origin_hostname_mismatch: "Origin and hostname mismatch",
      custom_block: "Custom block rule matched",
      blocked_domains: "Blocked domains",
      blocked_paths: "Blocked paths",
      blocked_query_parameters: "Blocked query parameters",
      blocked_referrers: "Blocked referrers",
      blocked_user_agents: "Blocked user agents",
      blocked_ips: "Blocked IPs",
      blocked_asns: "Blocked ASNs",
      blocked_countries: "Blocked countries",
      blocked_regions: "Blocked regions",
    },
    requestKindLabels: {},
    overviewLabels: {
      windowDays: "Last {days} days",
    },
    normalDetail: {},
  },
  systemSettings: {
    notificationEmailTitle: "Email notifications",
    emailGatewayNotReady: "Email isn't set up on this Every App gateway.",
    emailSenderLabel: "Sender",
    retentionTitle: "Operational data retention",
    retentionDescription:
      "Configure how long task runs, task logs, notification messages and detailed analytics remain available. Task and notification changes affect new records only; detailed analytics older than the new limit are deleted on the next daily run.",
    scheduledTaskLogsDaysLabel: "Scheduled task logs and runs (days)",
    notificationTestDaysLabel: "Test notifications (days)",
    notificationAttentionDaysLabel: "Warning and critical notifications (days)",
    notificationDefaultDaysLabel: "Other notifications (days)",
    analyticsDetailDaysLabel:
      "Detailed analytics: page views and events (days; hourly totals are kept)",
    retentionRangeHint: "Enter an integer from 1 to 3650 days.",
    retentionSave: "Save retention settings",
    retentionSaving: "Saving...",
    retentionSaved: "Retention settings saved.",
    retentionSaveFailed: "Failed to save retention settings.",
    enabledOn: "Enabled",
    enabledOff: "Disabled",
    cancel: "Cancel",
    retentionLowerTitle: "Delete older analytics?",
    retentionLowerDescription:
      "Page views and events older than {days} days are deleted on the next daily run. Hourly totals are kept. This can't be undone.",
    retentionLowerConfirm: "Save and delete",
  },
  systemPerformance: {
    refresh: "Refresh",
    loadFailed: "Couldn't load ingestion data.",
    noData: "No ingestion data in this period.",
    range15m: "Last 15 minutes",
    range1h: "Last hour",
    range6h: "Last 6 hours",
    range24h: "Last 24 hours",
    totalEvents: "Accepted events",
    p95Latency: "P95 estimated delay",
    p50Latency: "P50",
    p75Latency: "P75",
    p50Label: "P50",
    p75Label: "P75",
    p95Label: "P95",
    dataFreshness: "Data freshness",
    noRecentWrite: "No recent write",
    clockAnomalies: "Clock / delay anomalies",
    delayed: "Delayed",
    future: "Future timestamps",
    latencyPercentileTrend: "Latency percentile trend",
    latencyPercentileTrendDescription:
      "View estimated P50, P75, and P95 delay for received events.",
    throughputTrend: "Accepted event throughput",
    throughputTrendDescription: "View the throughput of received events.",
    visits: "Visits",
    customEvents: "Custom events",
    anomalyBucket: "Anomaly bucket",
    openVisitHealth: "Open visit backlog",
    openVisitHealthDescription: "Visits that haven't ended yet.",
    open: "Open",
    stale: "Stale",
    timedOut: "Timed out",
    oldestOpen: "Oldest open",
    latestActivity: "Latest activity",
    latencySampleHealth: "Latency sample health",
    latencySampleHealthDescription: "View the delay of trusted events.",
    trustedSamples: "Trusted samples",
    topSitesTitle: "Top sites by load",
    topSitesDescription: "Sites receiving the most events in the current view.",
    events: "Events",
    avgLatency: "Avg delay",
    slowestEventsTitle: "Slowest events",
    slowestEventsDescription:
      "Events with the longest delay between happening and being saved.",
    eventTime: "Event time",
    serverTime: "Server write time",
    estimatedDelay: "Estimated delay",
    doDiagnosticTitle: "Buffered data",
    doDiagnosticDescription:
      "Checks each site for data that hasn't been saved yet.",
    doDiagnosticLoadFailed: "Couldn't check buffered data.",
    doDiagnosticLoading: "Checking each site…",
    doDiagnosticRun: "Check buffered data",
    doDiagnosticEmpty: "No buffered data.",
    doDiagnosticUnreachable: "Unreachable sites",
    doDiagnosticReachableSites: "Reachable sites",
    doDiagnosticTotalSites: "Total sites",
    doDiagnosticActiveAlarms: "Active alarms",
    doDiagnosticBufferedVisits: "Buffered visits",
    doDiagnosticOpenVisits: "Buffered open visits",
    doDiagnosticOpenStale: "Idle over 30 minutes",
    doDiagnosticOpenTimedOut: "Idle over 12 hours",
    doDiagnosticOpenHardAged: "Started over 36 hours ago",
    doDiagnosticOpenFutureSkew: "Future timestamps",
    doDiagnosticStuckDirty: "Stuck unsaved",
    doDiagnosticMaxFlushAttempts: "Max retry attempts",
    doDiagnosticBufferedCustomEvents: "Buffered custom events",
    doDiagnosticOldestOpen: "Oldest open visit",
    doDiagnosticFutureMaxActivity: "Latest future activity time",
    doDiagnosticSiteList: "Top risk sites",
    doDiagnosticSiteListDescription: "The 20 sites most at risk.",
    doDiagnosticSiteFailed: "Unreachable",
    doDiagnosticSiteOpen: "Open",
    doDiagnosticSiteStuck: "Stuck",
    doDiagnosticSiteFuture: "Future timestamps",
    doDiagnosticSiteHardAged: "Over 36 hours old",
    doDiagnosticSiteAlarm: "Alarm",
    doDiagnosticSiteAlarmNone: "None",
    doDiagnosticSiteAlarmDue: "Due",
    doDiagnosticSiteNextDue: "Next due",
    doDiagnosticSiteNextDueFlush: "Flush",
    doDiagnosticSiteNextDueHidden: "Hidden fallback",
    doDiagnosticSiteNextDueTimeout: "Visit timeout",
    doDiagnosticSiteResponseMs: "Response time",
    doDiagnosticHealthy: "No abnormal buffered rows detected.",
  },
  loginForm: {},
  logoutAction: {},
  sidebarFooter: {
    gateway: "Back to Every App",
  },
  appNav: {
    appearance: "Appearance",
    mainNavigation: "Main navigation",
    toggleSidebar: "Toggle sidebar",
    sources: "Sources",
    audience: "Audience",
    goals: "Goals",
    sites: "Sites",
    allSites: "All sites",
    inbox: "Inbox",
    settings: "Settings",
    switchSite: "Switch site",
    siteSettings: "Site settings",
    addSite: "Add site",
    sections: "Sections",
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
      tracking: "Track your website",
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
    system: "System health",
    account: "Account",
    notifications: "Notifications",
    cancel: "Cancel",
  },
  systemHealth: {
    tabs: {
      tasks: "Scheduled tasks",
      blocked: "Blocked requests",
      ingestion: "Ingestion",
      data: "Data",
    },
  },
} as AppMessages;

const zhMessages = {
  appName: "OpenAnalytics",
  uiGallery: {
    categories: {},
  },
  navigation: {
    overview: "总览",
    realtime: "实时",
    pages: "页面",
    referrers: "来源",
    events: "事件",
    funnels: "目标与漏斗",
    campaigns: "推广",
    visitors: "访客",
    retention: "留存",
    geo: "位置",
    devices: "设备",
    performance: "性能",
    settings: "站点设置",
  },
  common: {
    deviceLabels: {
      desktop: "桌面端",
      mobile: "移动端",
      tablet: "平板端",
    },
    timeRelativePair: "{absolute}（{relative}）",
    id: "ID",
    views: "浏览量",
    sessions: "会话数",
    visitors: "访客数",
    bounceRate: "跳出率",
    avgDuration: "平均停留时长",
    path: "路径",
    title: "标题",
    hostname: "主机名",
    referrerHost: "来源主机",
    entryPage: "入口页面",
    exitPage: "出口页面",
    referrer: "来源",
    event: "事件",
    location: "地区",
    browser: "浏览器",
    operatingSystem: "操作系统",
    deviceType: "设备类型",
    country: "国家",
    region: "地区",
    regionCode: "地区代码",
    city: "城市",
    continent: "大洲",
    latitude: "纬度",
    longitude: "经度",
    continentLabels: {
      AF: "非洲",
      AN: "南极洲",
      AS: "亚洲",
      EU: "欧洲",
      NA: "北美洲",
      OC: "大洋洲",
      SA: "南美洲",
      AFRICA: "非洲",
      ANTARCTICA: "南极洲",
      ASIA: "亚洲",
      EUROPE: "欧洲",
      "NORTH AMERICA": "北美洲",
      OCEANIA: "大洋洲",
      "SOUTH AMERICA": "南美洲",
    },
    timezone: "时区",
    organization: "运营商组织",
    screenSize: "屏幕大小",
    loading: "加载中",
    noData: "暂无数据",
    loadFailed: "无法加载",
    retry: "重试",
    filteredEmpty: "没有符合这些筛选条件的数据",
    clearFilters: "清除筛选",
    trend: "趋势",
    unknown: "未知",
    site: "站点",
    system: "系统",
    theme: "主题",
    language: "语言",
    search: "搜索",
    open: "打开",
    sortBy: "按 {label} 排序",
    change: "变化",
    new: "新增",
    tableExport: {
      action: "导出",
      title: "导出 CSV",
      description: "将表格数据下载为 CSV 文件。",
      scopeLabel: "导出范围",
      currentTab: "当前标签页",
      allTabs: "全部标签页",
      rowsLabel: "数据",
      currentView: "当前显示数据",
      rawRows: "原始数据",
      fileNameLabel: "文件名",
      download: "导出 CSV",
      empty: "当前没有可导出的行。",
    },
    tableColumns: {
      action: "列设置",
      title: "配置表格列",
      description: "选择要显示的列，并拖动调整顺序。",
      visible: "显示的列",
      required: "必需",
      reset: "恢复默认",
      dragHint: "拖动调整顺序",
      close: "关闭",
    },
    close: "关闭",
    sitesFiltered: "已筛选 {active} / {total} 个站点",
    cumulativeTraffic: "全部周期累计流量",
    cumulativeEvents: "全部周期累计事件",
  },
  ranges: {
    today: "今天",
    yesterday: "昨天",
    last7d: "最近 7 天",
    last30d: "最近 30 天",
    last90d: "最近 90 天",
    last12m: "最近 12 个月",
    custom: "自定义时间段",
  },
  intervals: {
    minute: "分钟",
    hour: "小时",
    day: "日",
    week: "周",
    month: "月",
  },
  dashboardHeader: {
    interval: "时间间隔",
    compareButton: "对比",
    compareTitle: "对比设置",
    compareTimeLabel: "对比时间",
    compareCurrentPeriod: "当前周期",
    comparePreviousPeriod: "上一周期",
    compareFilterLabel: "对比筛选",
    compareFollowCurrentFilter: "跟随当前筛选",
    compareCustomFilter: "自定义筛选",
    compareApply: "应用对比",
    compareCancel: "取消",
    filterButton: "筛选",
    filterButtonEvent: "筛选 (事件)",
    filterButtonSession: "筛选 (会话)",
    filterButtonVisitor: "筛选 (访客)",
    customHint: "请选择开始和结束日期。",
    customPendingEnd: "已选择开始日期，请继续选择结束日期。",
    customApply: "应用日期范围",
    filterTitle: "筛选条件",
    previousPeriod: "上个周期",
    nextPeriod: "下个周期",
    customSelectionSummary: "当前选择：{from} 至 {to}（共 {days} 天）",
  },
  filters: {
    clear: "清除",
  },
  conditionDescription: {
    and: "且",
    or: "或",
    not: "不满足（{description}）",
    emptyConditions: "尚未设置条件",
    emptyFilter: "尚未设置筛选条件",
    filterEquals: "{field} 为 {value}",
    filterNotEquals: "{field} 不为 {value}",
    filterAnyOf: "{field} 是以下任一值：{values}",
    filterNoneOf: "{field} 不属于以下任一值：{values}",
    filterBetween: "{field} 介于 {from} 与 {to} 之间",
    filterContains: "{field} 包含 {value}",
    filterStartsWith: "{field} 以 {value} 开头",
    filterEndsWith: "{field} 以 {value} 结尾",
    filterGreaterThan: "{field} 大于 {value}",
    filterGreaterThanOrEqual: "{field} 大于或等于 {value}",
    filterLessThan: "{field} 小于 {value}",
    filterLessThanOrEqual: "{field} 小于或等于 {value}",
    filterExists: "{field} 存在",
    filterNotExists: "{field} 不存在",
    filterIsNull: "{field} 为 NULL",
    filterNotNull: "{field} 不为 NULL",
    filterIsEmpty: "{field} 为空",
    filterNotEmpty: "{field} 不为空",
  },
  filterBuilder: {
    fieldGroups: {
      advanced: "高级",
      page: "页面",
      session: "会话",
      visitor: "访客",
      referrer: "来源与渠道",
      campaign: "营销活动",
      client: "客户端",
      geography: "地理位置",
      event: "事件",
      acquisition: "获客",
      device: "设备",
      geo: "地理",
      performance: "性能",
      user: "用户",
      time: "时间",
      aggregation: "聚合",
      calculation: "计算",
      relation: "行为关系",
    },
    fieldLabels: {
      "page.path": "页面路径",
      "page.title": "页面标题",
      "page.collection": "页面集合",
      "page.hostname": "页面域名",
      "page.query": "查询参数",
      "page.hash": "URL Hash",
      "session.entryPath": "入口页面",
      "session.exitPath": "出口页面",
      "referrer.domain": "来源域名",
      "referrer.url": "来源 URL",
      "traffic.channel": "流量渠道",
      "utm.source": "UTM 来源",
      "utm.medium": "UTM 媒介",
      "utm.campaign": "UTM 活动",
      "utm.term": "UTM 关键词",
      "utm.content": "UTM 内容",
      "client.browser": "浏览器",
      "client.browserVersion": "浏览器版本",
      "client.browserEngine": "浏览器引擎",
      "client.os": "操作系统",
      "client.osVersion": "操作系统版本",
      "client.deviceType": "设备类型",
      "client.language": "语言",
      "client.screenSize": "屏幕尺寸",
      "geo.country": "国家 / 地区",
      "geo.region": "省 / 州 / 地区",
      "geo.city": "城市",
      "geo.continent": "大洲",
      "geo.timeZone": "时区",
      "geo.organization": "网络组织",
      "event.collection": "事件集合",
      "event.name": "事件名称",
      "event.payload": "事件属性",
      "page.durationMs": "页面停留时长",
      "session.collection": "会话集合",
      "session.durationMs": "会话时长",
      "session.views": "页面浏览数",
      "session.events": "事件数",
      "session.bounce": "是否跳出",
      "visitor.collection": "访客集合",
      "visitor.sessions": "会话数",
      "visitor.views": "页面浏览数",
      "visitor.events": "事件数",
      "performance.ttfbMs": "TTFB",
      "performance.fcpMs": "FCP",
      "performance.lcpMs": "LCP",
      "performance.cls": "CLS",
      "performance.inpMs": "INP",
      "user.id": "用户 ID",
      "user.name": "用户名称",
      "client.screenWidth": "屏幕宽度",
      "client.screenHeight": "屏幕高度",
      "geo.isEU": "是否欧盟地区",
      time: "时间",
      "time(...)": "活动时间",
      $items: "周期中的项目",
      $span: "序列跨度",
      "$gap(...)": "步骤间隔",
      "$same(...)": "步骤共有值",
      "bucket(...)": "时间分桶",
      "window(...)": "相对时间窗口",
      "periods(...)": "周期分组",
      "count(...)": "计数",
      "first(...)": "第一个",
      "last(...)": "最后一个",
      "nth(...)": "第 N 个",
      "countDistinct(...)": "去重计数",
      "sum(...)": "求和",
      "avg(...)": "平均值",
      "min(...)": "最小值",
      "max(...)": "最大值",
      "add(...)": "相加",
      "sub(...)": "相减",
      "mul(...)": "相乘",
      "div(...)": "相除",
      "sequence(...)": "行为序列",
      "adjacent(...)": "连续序列",
      "without(...)": "排除中间行为",
    },
    operatorLabels: {
      eq: "等于",
      neq: "不等于",
      in: "属于任一值",
      notIn: "不属于任一值",
      contains: "包含",
      startsWith: "以此开头",
      endsWith: "以此结尾",
      gt: "大于",
      gte: "大于或等于",
      lt: "小于",
      lte: "小于或等于",
      between: "介于两者之间",
      exists: "存在",
      notExists: "不存在",
      isNull: "为 NULL",
      notNull: "不为 NULL",
      isEmpty: "为空字符串",
      notEmpty: "不为空字符串",
    },
    valueType: "值类型",
    valueKinds: {
      string: "文本",
      enum: "枚举",
      number: "数字",
      boolean: "布尔值",
      date: "日期",
      datetime: "日期和时间",
      "json-scalar": "JSON 标量",
    },
    booleanTrue: "是",
    booleanFalse: "否",
    valueUnset: "(未设置)",
    valueLoading: "正在加载值",
    valueSearchPlaceholder: "搜索或输入值",
    valueListPlaceholder: "搜索或输入值后按 Enter 添加",
    removeValue: "移除筛选值「{value}」",
    rangeStartPlaceholder: "下限",
    rangeEndPlaceholder: "上限",
    unitAriaLabel: "显示单位",
    durationUnit: "时间单位",
    units: {
      hours: "小时",
      minutes: "分钟",
      seconds: "秒",
      milliseconds: "毫秒",
      percent: "%",
      perMille: "‰",
      pixels: "像素",
    },
    jsonPointer: "JSON 指针",
    jsonPointerPlaceholder: "搜索或输入 JSON 指针",
    match: "匹配方式",
    expression: "筛选表达式",
    expressionPlaceholder: "筛选表达式...",
    naturalLanguageDescription: "自然语言描述",
    expressionInvalid: "表达式无效，点击查看语法帮助",
    expressionHelpTitle: "筛选表达式语法",
    expressionHelpDescription: "可在筛选表达式中使用的字段和操作符。",
    expressionHelpSyntax: "语法",
    expressionHelpLogicDescription:
      "AND 的优先级高于 OR。使用括号表达嵌套；AND(...) 和 OR(...) 可保留显式的单条件分组。",
    expressionHelpValues: "值",
    expressionHelpValuesDescription:
      "字符串使用 JSON 双引号；数字和布尔值不加引号。集合使用 [值, 值]，between 必须使用两个有序的值。",
    expressionHelpOperators: "可用操作符",
    expressionHelpUnaryOperators: "无需值的操作符",
    expressionHelpFields: "可用字段",
    expressionHelpFieldType: "类型",
    expressionHelpFieldOperators: "操作符",
    expressionHelpOtherFields: "其他",
    expressionHelpContextTitle: "活动时间与上下文内建值",
    expressionHelpContextDescription:
      "小写点分名称表示已注册字段；大写 PAGE、EVENT、SESSION 和 VISITOR 表示实体集合。在实体筛选器内，$.member 表示当前实体，-> 显式投影集合成员。@ 表示时间锚点；序列和周期筛选器还提供 $span、$gap 和 $items。",
    expressionHelpContextExamples:
      'time(last(PAGE)) gte @now-14d\nsequence([EVENT { $.name eq "signup" }, EVENT { $.name eq "purchase" }]) {\n  $span lte 14d AND $gap(1, 2) lte 7d AND $same($.payload("/productId"))\n} exists\nperiods(EVENT, 1w) { count($items) gte 3 } exists',
    advancedEditor: {
      not: "非",
      removeNot: "移除“非”",
      matchAll: "全部匹配",
      matchAny: "任意匹配",
      addCondition: "添加条件",
      addGroup: "添加分组",
      wrapInNot: "添加“非”",
      remove: "移除",
      condition: "条件",
      literalValue: "字面值",
      compareWithExpression: "与表达式比较",
      valuesAsJson: "筛选值（JSON）",
      scalarArrayHelp: "输入由 JSON 标量值组成的数组。",
      chooseValue: "选择一个值",
      filterValue: "筛选值",
      durationAmount: "时间长度",
      jsonPointer: "事件载荷 JSON 指针",
      jsonPointerPlaceholder: "/属性/路径",
      entityMember: "实体成员",
      nthIndex: "第 N 项索引",
      fromStep: "起始步骤",
      toStep: "结束步骤",
      occurrenceKind: "活动选择方式",
      occurrenceEntity: "活动类型",
      occurrenceIndex: "活动序号",
      correlationTarget: "每个步骤共有的值",
      periodItemCount: "每个周期的项目数",
      nestedTooDeep: "表达式嵌套过深。",
      applyOffset: "应用偏移量",
      removeStep: "移除步骤",
      addStep: "添加序列步骤",
      excludedActivity: "排除的活动",
      fixedTime: "固定时间",
      toggleOffsetSign: "切换时间偏移正负",
      timeUnits: {
        milliseconds: "毫秒",
        seconds: "秒",
        minutes: "分钟",
        hours: "小时",
        days: "天",
        weeks: "周",
        months: "月",
        years: "年",
      },
      coreRelation: "高级筛选",
      coreRelationExpression: "高级筛选表达式",
      structuredEditor: "高级筛选控件",
      unavailableForObservation: "Goal 和 Funnel 步骤不支持高级筛选。",
      targetKinds: {
        time: "时间",
        field: "字段",
        "event-payload": "事件载荷",
        "entity-root": "实体集合",
        "context-root": "上下文",
        "context-intrinsic": "上下文内建值",
        "occurrence-time": "活动时间",
        member: "成员",
        selector: "选择器",
        projection: "投影",
        reducer: "归约器",
        arithmetic: "算术表达式",
        duration: "时间长度",
        "time-anchor": "相对时间",
        "sequence-span": "序列跨度",
        "sequence-gap": "步骤间隔",
        "sequence-same": "序列共有值",
        "period-items": "周期项目",
        bucket: "时间桶",
        window: "时间窗口",
        periods: "周期集合",
        sequence: "序列",
        adjacent: "相邻序列",
        without: "排除活动的序列",
      },
    },
    savedFiltersLoading: "正在获取已保存的筛选...",
    noSavedFilter: "不使用已保存的筛选",
    systemPresets: "系统预设",
    advanced: "高级",
    systemPresetScopes: {
      preserve: "保留当前范围",
      event: "事件范围",
      session: "会话范围",
      visitor: "访客范围",
    },
    systemPresetItems: {
      directTraffic: {
        name: "直接访问",
        description: "没有外部来源的访问。",
      },
      organicSearchDiscovery: {
        name: "自然搜索发现",
        description: "没有营销活动标记的搜索引擎来源访问。",
      },
      campaignTaggedTraffic: {
        name: "带活动标记的流量",
        description: "带有活动来源、媒介或名称的访问。",
      },
      mobileTraffic: {
        name: "移动端流量",
        description: "来自移动设备的访问。",
      },
      bouncedSessions: {
        name: "跳出会话",
        description: "只包含一次页面浏览的会话。",
      },
      returningVisitors: {
        name: "回访访客",
        description: "至少拥有两个会话的访客。",
      },
    },
    savedFiltersPersonal: "个人筛选",
    savedFiltersTeam: "组织筛选",
    savedFiltersAuthor: "作者：{name}",
    savedFiltersPrivate: "个人",
    savedFiltersTeamShared: "已与组织共享",
    saveThisFilter: "保存此筛选",
    saveAsThisFilter: "另存此筛选",
    manageThisFilter: "管理此筛选",
    finishEditingFilter: "完成编辑",
    createSavedFilter: "保存筛选",
    manageSavedFilter: "管理筛选",
    savedFilterName: "名称",
    savedFilterDescription: "备注",
    scopeLabel: "筛选范围",
    scopeAuto: "根据当前页面自动选择",
    scopeEvent: "筛选符合当前条件的事件",
    scopeSession: "筛选满足这些条件的会话",
    scopeVisitor: "筛选满足这些条件的访客",
    savedFilterVisibility: "可见性",
    savedFilterVisibilityPrivate: "仅自己可见",
    savedFilterVisibilityTeam: "与组织共享",
    savedFilterCreateDescription: "保存当前的筛选表达式，以便之后再次套用。",
    savedFilterManageDescription: "更新此筛选的基本信息，或开始编辑筛选条件。",
    editSavedFilter: "修改此筛选",
    deleteSavedFilter: "删除此筛选",
    deleteSavedFilterTitle: "删除此筛选？",
    deleteSavedFilterDescription:
      "删除后无法恢复，组织中的其他成员也将无法再使用它。",
    savedFilterCancel: "取消",
    savedFilterSave: "保存",
    savedFilterSaving: "正在保存...",
    savedFilterDelete: "删除",
    savedFilterDeleting: "正在删除...",
    savedFilterOperationFailed: "操作失败，请稍后重试。",
    apply: "应用筛选",
    allConditions: "全部条件均满足",
    anyCondition: "满足任一条件",
    condition: "条件 {index}",
    group: "组 {index}",
    invertCondition: "反转此条件",
    exclude: "排除",
    addGroup: "添加分组",
    invalid: "请先完成每一条筛选条件。",
  },
  realtime: {
    title: "实时",
    logTitleSeparator: "：",
    activeNow: "当前在线",
    liveCount: "{count} 人在线",
    liveMetrics: "当前在线 / 近 30 分钟访客 / 近 30 分钟浏览量",
    connected: "已连接",
    connecting: "连接中",
    reconnecting: "重连中",
    failed: "连接失败",
    recentEvents: "实时事件",
    enterPage: "进入页面",
    leavePage: "退出页面",
    viewPage: "访问页面",
    customEvent: "自定义事件",
    detailsTitle: "事件详情",
    browsingSection: "浏览",
    geographySection: "地理位置",
    sourceSection: "来源",
    statusLabels: {
      active: "活跃",
      completed: "已完成",
      open: "进行中",
      complete: "已完成",
      hidden_pending: "等待隐藏确认",
    },
    visibilityStateLabels: {
      visible: "可见",
      hidden: "隐藏",
    },
    visibilityVisible: "页面变为可见",
    visibilityHidden: "页面变为不可见",
    visibilityChange: "页面可见性变化",
    visitorHistorySection: "访客记录",
    visitorHistorySubtitle: "查看该访客在当前实时窗口内的全部访问记录。",
    visitorHistoryRange: "浏览时间",
    visitorHistoryEmpty: "当前还没有更多该访客的访问记录。",
    visitorMapUnavailable: "当前事件没有可用的定位坐标。",
    visitorId: "访客 ID",
    sessionId: "会话 ID",
    visitId: "访问 ID",
    eventTime: "事件时间",
    eventKind: "事件种类",
    eventName: "事件名称",
    traceId: "追踪 ID",
    receivedAt: "接收时间",
    startedAt: "开始时间",
    previousVisitStartedAt: "上一次访问开始时间",
    userId: "用户 ID",
    userName: "用户名",
    isEU: "欧盟访客",
    queryString: "查询字符串",
    utmSource: "UTM 来源",
    utmMedium: "UTM 媒介",
    utmCampaign: "UTM 活动",
    utmTerm: "UTM 关键词",
    utmContent: "UTM 内容",
    browserVersion: "浏览器版本",
    osVersion: "操作系统版本",
    userAgent: "User-Agent",
    postalCode: "邮政编码",
    metroCode: "都会区编码",
    status: "状态",
    visibilityState: "可见性状态",
    endedAt: "结束时间",
    duration: "持续时间",
    durationSource: "持续时间来源",
    exitReason: "退出原因",
    leaveAt: "离开时间",
  },
  overview: {
    title: "总览",
    trendTitle: "访问趋势",
    sourceTab: "来源",
    sourceDomainColumn: "来源（域名）",
    sourceLinkTab: "来源链接",
    sourceLinkColumn: "来源链接",
    channelTab: "渠道",
    channelColumn: "渠道",
    direct: "直接访问",
    channelLabels: {
      direct: "直接访问",
      organic_search: "自然搜索",
      social: "社交媒体",
      paid_search: "付费搜索",
      paid_social: "付费社交",
      display: "展示广告",
      email: "邮件",
      affiliate: "联盟/合作",
      referral: "外部引荐",
      campaign: "营销活动",
      other: "其他",
    },
    searchInTab: "搜索{tab}",
  },
  install: {
    title: "将脚本添加到你的网站",
    platforms: {
      html: "HTML",
      wordpress: "WordPress",
      shopify: "Shopify",
      nextjs: "Next.js",
      gtm: "Google 跟踪代码管理器",
    },
    steps: {
      html: "在每个页面的 {tag} 之前粘贴它。",
      wordpress:
        "用 WPCode 等页头脚本插件添加，或粘贴到主题 header.php 的 {tag} 之前。",
      shopify:
        "在“在线商店 → 模板 → 编辑代码”中打开 theme.liquid，粘贴到 {tag} 之前。",
      nextjs: "在 app/layout.tsx 的 {tag} 中粘贴它。",
      gtm: "用它创建一个“自定义 HTML”代码，触发条件选“所有网页”，然后发布。",
    },
    waiting: "正在等待第一次页面浏览",
    received: "已收到第一次页面浏览，报表将在一分钟内更新。",
    firstViewsTitle: "第一批页面浏览已到达！",
    nextReports: "通过邮件接收报告",
    nextInvite: "邀请成员",
    dismiss: "关闭",
  },
  pages: {
    title: "页面",
    pagesPerSession: "每会话页面数",
    changePercentColumnLabel: "{metric}变化（%）",
    changePointsColumnLabel: "{metric}变化（百分点）",
    percentagePointSuffix: "个百分点",
    untitled: "未命名页面",
    empty: "暂无页面",
    loadMoreError: "加载更多页面失败。",
    trendTitle: "页面访问趋势",
    otherPages: "其他页面",
    hashTab: "锚点",
    noHash: "无锚点",
    queryTab: "查询参数",
    noQuery: "无查询参数",
    eventTab: "事件",
    eventsMetric: "事件数",
    viewDetails: "查看详情",
  },
  referrers: {
    title: "来源",
    splitTitle: "来源拆分",
    breakdownTitle: "来源明细",
    externalLabel: "外部来源",
    longTail: "长尾来源",
    channelLongTail: "其他渠道",
  },
  campaigns: {
    title: "推广",
    tabSource: "UTM 来源",
    tabMedium: "媒介",
    tabCampaign: "活动",
    tabTerm: "关键词",
    tabContent: "内容",
    notSet: "未设置",
    noTaggedTraffic: "此期间暂无带 UTM 标签的访问",
    taggedLinkHint: "在链接中添加 UTM 标签，例如",
  },
  sessions: {
    title: "会话",
    search: "搜索会话...",
    started: "开始时间",
    sessionId: "会话 ID",
    visitor: "访客",
    anonymous: "匿名访客",
    entryPage: "入口页面",
    exitPage: "出口页面",
    duration: "时长",
    referrer: "来源",
    location: "地区",
    os: "操作系统",
    browser: "浏览器",
    device: "设备",
    pageViews: "页面浏览量",
    customEvents: "自定义事件",
    screenSize: "屏幕尺寸",
    exitTime: "退出时间",
    loadError: "无法加载会话数据。",
    empty: "当前时间范围内没有会话。",
  },
  sessionDetail: {
    anonymous: "匿名访客",
    userId: "用户 ID",
    userName: "用户名",
    back: "返回会话",
    missing: "缺少 sessionId。",
    notFound: "没有找到这个会话。",
    loadError: "无法加载会话详情。",
    active: "进行中",
    inactive: "已结束",
    status: "状态",
    duration: "时长",
    screenViews: "页面浏览量",
    events: "事件",
    bounce: "是否跳出",
    entryPath: "入口路径",
    exitPath: "出口路径",
    referrerName: "来源名称",
    os: "操作系统",
    browser: "浏览器",
    device: "设备",
    screen: "屏幕",
    yes: "是",
    no: "否",
    uniquePages: "不同页面数",
    firstEvent: "首个事件",
    lastEvent: "最后事件",
    sessionStarted: "会话开始",
    pageview: "访问页面",
    exitPage: "退出页面",
    customEvent: "自定义事件",
    eventTitleSeparator: "：",
    visitDetailsTitle: "访问明细",
    visitDetailsSubtitle:
      "按发生顺序展示该会话内的开始、页面访问、退出和自定义事件。",
    location: "位置",
    visitorId: "访客 ID",
    sessionId: "会话 ID",
    referrerUrl: "来源链接",
    emptyEvents: "没有事件记录。",
    emptyCustomEvents: "暂无自定义事件",
    sincePrevious: "距上个事件",
    geoLocationTitle: "地理位置",
    performanceTitle: "当前会话性能",
    range: "范围",
  },
  events: {
    title: "事件",
    detailTitle: "事件详情",
    backToEvents: "返回事件总览",
    totalEvents: "事件总数",
    eventTypes: "事件类型",
    sessions: "触发会话",
    visitors: "触发访客",
    avgEventsPerSession: "平均事件/会话",
    shareOfAllEvents: "事件占比",
    triggerCount: "触发量",
    triggerVisitors: "触发人数",
    trendTitle: "事件趋势",
    topEvents: "事件排行",
    recordsTitle: "事件记录",
    fieldsTitle: "事件载荷字段",
    fieldsSubtitle: "选择字段后查看其值分布和元数据。",
    fieldValuesTitle: "字段值",
    fieldValuesSubtitle: "展示当前字段的记录及出现次数，点击以进行筛选。",
    fieldValuesEmpty: "当前字段暂无记录。",
    payloadFilter: "筛选",
    payloadFilterTitle: "事件载荷筛选",
    payloadFilterSubtitle: "每行一个条件，可使用 == 或 != 组合筛选。",
    payloadFilterPlaceholder: 'path.value == "a"\nlevel != 0',
    payloadFilterApply: "应用筛选",
    payloadFilterClear: "清空筛选",
    payloadFilterInvalid: "无法解析筛选条件，请检查字段路径、操作符和值。",
    expandField: "展开字段",
    collapseField: "收起字段",
    search: "搜索事件名、ID、访客、会话、页面...",
    eventName: "事件名",
    eventId: "事件 ID",
    occurredAt: "发生时间",
    receivedAt: "接收时间",
    page: "页面",
    context: "上下文",
    visitor: "访客",
    visit: "访问",
    referrer: "来源",
    location: "地区",
    browser: "浏览器",
    os: "操作系统",
    device: "设备",
    payload: "事件载荷",
    nodeCount: "节点数",
    payloadFields: "事件载荷字段",
    values: "值",
    nodes: "节点",
    occurrences: "出现次数",
    openVisitor: "打开访客",
    openSession: "打开会话",
    integratingEvent: "正在整合事件 ({seconds}s)",
    copyJson: "复制 JSON",
    copiedJson: "JSON 已复制。",
    copyJsonFailed: "无法复制 JSON。",
    copyValue: "复制值",
    copiedValue: "值已复制。",
    copyValueFailed: "复制值失败。",
    loadError: "无法加载事件数据。",
    detailNotFound: "未找到该事件记录。",
    empty: "当前筛选范围内没有自定义事件。",
    noCustomEvents: "此期间暂无自定义事件",
    emptyFields: "当前事件暂无事件载荷字段。",
    noEventName: "缺少事件名。",
    loading: "加载中",
    other: "其他",
  },
  funnels: {
    title: "漏斗",
    listTitle: "漏斗定义",
    conversionRecords: "转化记录",
    converted: "已转化",
    dropped: "已流失",
    open: "打开漏斗",
    moreActions: "更多操作",
    createTitle: "创建漏斗",
    nameLabel: "名称",
    namePlaceholder: "注册激活",
    stepsLabel: "步骤",
    addStep: "添加步骤",
    removeStep: "移除步骤",
    progression: "计数依据",
    conversionWindow: "转化窗口",
    custom: "自定义",
    customWindowHours: "自定义窗口（小时）",
    stepFilter: "步骤筛选",
    filter: "筛选",
    apply: "应用",
    condition: "个条件",
    conditions: "个条件",
    expression: "筛选表达式",
    filterPlaceholder: '例如 page.path eq "/pricing"',
    invalidFilter: "筛选无效",
    dragStep: "拖动步骤",
    unnamed: "（未命名）",
    oneHour: "1 小时",
    oneDay: "24 小时",
    sevenDays: "7 天",
    thirtyDays: "30 天",
    save: "创建",
    saveEdit: "保存修改",
    edit: "编辑",
    editTitle: "编辑漏斗",
    creating: "创建中...",
    cancel: "取消",
    delete: "删除",
    deleteTitle: "删除漏斗",
    deleteDescription: "这会移除已保存的漏斗定义，不会删除历史分析数据。",
    deleteConfirm: "删除漏斗",
    deleting: "删除中...",
    detailLoadError: "无法加载漏斗分析。",
    invalidFunnel: "请填写名称，并至少补全两个筛选步骤。",
    created: "漏斗已创建。",
    createFailed: "创建漏斗失败。",
    updatedSuccess: "漏斗已更新。",
    saveFailed: "保存漏斗失败。",
    deleted: "漏斗已删除。",
    deleteFailed: "删除漏斗失败。",
    overallConversion: "总转化率",
    startedSessions: "起始会话数",
    startedVisitors: "起始访客数",
    convertedSessions: "转化会话数",
    convertedVisitors: "转化访客数",
    largestDropOff: "最大流失",
    noDropOff: "无流失",
    step: "步骤",
    sessions: "会话",
    visitors: "访客",
    conversion: "转化率",
    stepConversion: "步骤转化率",
    dropOff: "流失",
    updated: "更新于",
  },
  goals: {
    title: "目标分析",
    conversionRecords: "转化记录",
    open: "打开目标",
    moreActions: "更多操作",
    createTitle: "创建目标",
    nameLabel: "名称",
    namePlaceholder: "完成购买",
    filter: "转化条件",
    apply: "应用",
    cancel: "取消",
    save: "创建",
    saveEdit: "保存修改",
    edit: "编辑",
    editTitle: "编辑目标",
    creating: "创建中...",
    delete: "删除",
    deleteTitle: "删除目标",
    deleteDescription: "这会移除已保存的目标定义，不会删除历史分析数据。",
    deleteConfirm: "删除目标",
    detailLoadError: "无法加载目标分析。",
    invalidGoal: "请填写名称，并补全转化条件。",
    created: "目标已创建。",
    updatedSuccess: "目标已更新。",
    saveFailed: "保存目标失败。",
    deleted: "目标已删除。",
    deleteFailed: "删除目标失败。",
    sessions: "会话",
    visitors: "访客",
    total: "总数",
    converted: "已转化",
    conversion: "转化率",
    timeseries: "转化率",
    updated: "更新于",
  },
  conversions: {
    new: "新建",
    newGoal: "目标",
    newGoalDescription: "单个步骤，例如注册",
    newFunnel: "漏斗",
    newFunnelDescription: "按顺序完成的多个步骤",
    empty: "暂无目标或漏斗",
    emptyMemberHint: "管理员可以创建。",
  },
  visitors: {
    title: "访客",
    search: "搜索访客...",
    visitor: "访客",
    anonymous: "匿名访客",
    referrer: "来源",
    location: "地区",
    os: "操作系统",
    browser: "浏览器",
    device: "设备",
    firstSeen: "首次访问",
    lastSeen: "最近访问",
    pageViews: "页面浏览量",
    sessions: "会话数",
    customEvents: "自定义事件",
    screenSize: "屏幕尺寸",
    loadError: "无法加载访客数据。",
    empty: "当前时间范围内没有访客。",
  },
  visitorDetail: {
    anonymous: "匿名访客",
    userId: "用户 ID",
    userName: "用户名",
    back: "返回访客",
    missing: "缺少 visitorId。",
    notFound: "没有找到这个访客。",
    loadError: "无法加载访客详情。",
    totalDuration: "总时长",
    events: "事件",
    views: "页面浏览量",
    uniquePages: "不同页面数",
    avgPagesPerSession: "平均页面/会话",
    avgEventsPerSession: "平均事件/会话",
    avgStay: "平均停留时长",
    firstSeen: "首次访问",
    lastSeen: "最近访问",
    daysActive: "活跃天数",
    avgTimeBetweenSessions: "平均会话间隔",
    activity: "活跃记录",
    sessionRecords: "会话记录",
    started: "开始时间",
    visitor: "访客",
    duration: "时长",
    referrer: "来源",
    pageViews: "页面浏览量",
    visitDetailsTitle: "访问明细",
    visitDetailsSubtitle:
      "按发生顺序展示该访客的会话开始、页面访问、退出和自定义事件。",
    customEvents: "自定义事件",
    emptyEvents: "没有事件记录。",
    emptyCustomEvents: "暂无自定义事件",
    emptySessions: "没有会话记录。",
    visitorId: "访客 ID",
    sessionId: "会话 ID",
    referrerName: "来源名称",
    referrerUrl: "来源链接",
    location: "位置",
    browser: "浏览器",
    os: "操作系统",
    device: "设备",
    screen: "屏幕",
    entryPath: "入口路径",
    exitPath: "出口路径",
    sessionStarted: "会话开始",
    pageview: "访问页面",
    exitPage: "退出页面",
    customEvent: "自定义事件",
    eventTitleSeparator: "：",
    sincePrevious: "距上个事件",
    geoLocationTitle: "地理位置",
    performanceTitle: "当前访客性能",
    range: "范围",
  },
  retention: {
    title: "留存",
    cohortBy: "群组周期：{interval}",
    cohortDate: "群组日期",
    cohortSize: "人数",
    periodLabel: "第 {n} 期",
    matrixTitle: "留存矩阵",
    matrixSubtitle:
      "每一行是首次进入该周期的访客群组，每一列是后续周期的回访比例。",
    cohortsMetric: "群组数",
    visitorsMetric: "群组访客",
    periodOneMetric: "首期回访",
    averageReturnMetric: "平均回访",
    strongestCohortMetric: "最佳群组",
    eligibleVisitors: "符合条件的访客",
    periodsAnalyzed: "已分析周期",
    noEligibleCohorts: "暂无符合条件的群组",
    overallRetention: "整体留存",
    legendLow: "低",
    legendHigh: "高",
    periodZero: "初始",
    empty: "当前时间范围内没有足够的回访数据。",
    emptyHint: "在日期菜单中选择更长的时间范围或更粗的时间间隔。",
    loadError: "无法加载留存数据。",
    unavailableCell: "该群组还没有进入这个周期。",
    visitorsDetail: "访客",
    rateDetail: "留存率",
    sizeDetail: "人数",
  },
  geo: {
    title: "位置",
    mapTitle: "访客分布",
    countryLabel: "国家/地区",
    regionLabel: "州/省",
    cityLabel: "市/县",
    back: "返回上一级",
    viewOnWikipedia: "查看维基百科",
    investigationNotice: "这些数据来源于网络，可能存在错误。",
    timezoneDeltaVsLocal: "与本地时间相差 {delta}",
    visitorCoordinates: "访客坐标",
    ipNotice: "估算的 IP 位置，坐标为粗略范围，不代表精确家庭或办公地址。",
    multipleNotice: "该访客在不同会话中的旅程可能涉及多个城市。",
    investigation: {
      countryScopedLabel: "所属国家的{label}",
      capital: "首都",
      population: "人口",
      gdp: "GDP",
      gdpPerCapita: "人均 GDP",
      marketPenetration: "市场渗透率",
      region: "所属区域",
      currency: "货币",
      phonecode: "电话区号",
      timezone: "时区",
      type: "类型",
      iso: "ISO",
      coordinates: "坐标",
      unavailable: "暂无",
      gdpValue: "{value} 百万美元",
      gdpPerCapitaValue: "{value} 美元/人",
      gdpPerCapitaNearAverage: "{value} 美元/人（接近全球平均）",
      gdpPerCapitaAboveAverage: "{value} 美元/人（高于平均 {percent}%）",
      gdpPerCapitaBelowAverage: "{value} 美元/人（低于平均 {percent}%）",
      marketPenetrationWindow: "{label}({days}天)",
      timezoneCount: "{count} 个时区",
      typeLabels: {
        country: "国家",
        state: "州",
        province: "省",
        prefecture: "地级市",
        city: "市",
        county: "县",
        district: "区",
        town: "镇",
        village: "村",
        municipality: "市镇",
        territory: "地区",
        section: "片区",
        adm1: "一级行政区",
        adm2: "二级行政区",
        adm3: "三级行政区",
        adm4: "四级行政区",
        adm5: "五级行政区",
      },
    },
  },
  devices: {
    title: "设备",
    shareTitle: "访客占比",
    dimensions: {
      device: "设备",
      os: "操作系统",
      browser: "浏览器",
      engine: "引擎",
      screenSize: "屏幕尺寸",
    },
    crossTabTitle: "交叉分析",
    crossTabRows: "行",
    crossTabColumns: "拆分依据",
    otherLabel: "其他",
    screenBucketLabels: {},
  },
  browsers: {
    otherLabel: "其他",
  },
  performance: {
    title: "性能",
    empty: "暂无 Web Vitals 数据",
    chartTitle: "性能趋势",
    avgLabel: "平均值",
    samplesLabel: "样本数",
    p50Label: "P50",
    p75Label: "P75",
    p95Label: "P95",
    ttfb: "首字节时间",
    fcp: "首次内容绘制",
    lcp: "最大内容绘制",
    cls: "累积布局偏移",
    inp: "交互到下一次绘制",
    ttfbDescription:
      "衡量浏览器在收到服务器第一个字节前等待了多久，反映后端响应、网络延迟和缓存效果。",
    fcpDescription:
      "衡量页面首次绘制文本或图片的时间，反映访客多久能看到页面开始加载。",
    lcpDescription:
      "衡量视口内最大内容元素完成渲染的时间，是感知加载速度的核心指标。",
    clsDescription:
      "衡量页面生命周期中非预期布局位移的程度，数值越低表示视觉越稳定。",
    inpDescription:
      "衡量用户交互到下一次绘制之间的延迟，反映页面加载后的响应能力。",
    msUnit: "毫秒",
    secondsUnit: "秒",
    clsUnit: "分值",
    score: "体验评分",
    scoreDescription:
      "将加载、稳定性和交互指标的 P75 数值合成为 0 到 100 的体验评分，分数越高越好。",
    great: "优秀",
    needsImprovement: "需要改进",
    poor: "较差",
    datasetTitle: "阈值",
    interpretationTitle: "当前解读",
    currentReading:
      "{metric} 当前 P75 为 {value}，体验评分为 {score}，覆盖 {samples} 个样本。当前判定：{status}。",
    metricThresholdText:
      "优秀为不高于 {good}；需要改进为 {good} 到 {poor}；较差为高于 {poor}。",
    scoreThresholdText: "优秀为高于 90，需要改进为 50 到 90，较差为低于 50。",
    countryHealthTitle: "国家和地区健康度",
    countryHealthSubtitle: "根据 {metric} 对国家或地区边界进行健康度着色。",
    pathsTitle: "路径性能",
    pathsAnalyzedLabel: "已分析路径",
    metricValueColumn: "P75 数值",
    statusColumn: "状态",
  },
  share: {
    noData: "暂无数据",
  },
  siteSettings: {
    title: "站点设置",
    sections: {
      basic: {
        title: "常规",
      },
      tracking: {
        title: "跟踪",
      },
      blocking: {
        title: "拦截规则",
      },
      protection: {
        title: "防护",
      },
      danger: {
        title: "危险操作",
      },
      install: {
        title: "安装",
      },
      advanced: {
        title: "高级",
      },
    },
    nameLabel: "名称",
    domainLabel: "域名",
    publicSharingTitle: "分享",
    publicEnabledLabel: "公开看板",
    publicSlugLabel: "链接路径",
    publicSlugPlaceholder: "例如 my-site",
    publicSlugHint: "链接中 /share/ 之后的部分。",
    publicLinkLabel: "公开链接",
    copiedLink: "链接已复制",
    trackingStrengthGroupTitle: "跟踪强度",
    trackingStrengthStrong: "强",
    trackingStrengthSmart: "智能",
    trackingStrengthWeak: "弱",
    trackingStrengthStrongDescription:
      "始终进行针对访客的高精度跟踪。这可能违反某些国家的法规，例如 GDPR。",
    trackingStrengthSmartDescription: "自动根据访客所处国家切换跟踪强度。",
    trackingStrengthWeakDescription:
      "始终降低对访客的跟踪精度。这可能导致同一访客在不同时间访问时被计数多次、且无法计算留存率。",
    botProtectionEnabledLabel: "机器人拦截",
    botProtectionEnabledHint:
      "开启后拦截高置信度机器人请求；关闭后这类请求仍会计入统计。",
    hostingProxyBlockingEnabledLabel: "拦截托管/代理网络请求",
    hostingProxyBlockingEnabledHint: "拦截来自托管或代理网络的疑似机器人请求。",
    trackQueryParamsLabel: "跟踪查询参数",
    trackHashLabel: "跟踪 URL 哈希",
    blockingRulesSave: "保存规则",
    blockingRulesDialogs: {
      searchButton: "搜索",
      searchTitle: "搜索地区",
      searchDescription: "按名称或代码搜索，然后选择结果。",
      searchInputLabel: "搜索",
      searchInputPlaceholder: "按名称或代码搜索",
      searchCountryLabel: "国家 / 地区",
      searchRegionLabel: "州 / 省",
      searchBack: "更换国家 / 地区",
      searchLoading: "正在加载地区...",
      searchNoResults: "没有匹配的地区。",
      searchLoadError: "无法加载地区，请稍后重试。",
      searchClose: "关闭",
    },
    blockingRulesFields: {
      domains: {
        title: "域名",
        placeholder: "admin.example.com",
      },
      paths: {
        title: "路径",
        placeholder: "/admin/*",
      },
      queryParameters: {
        title: "查询参数",
        placeholder: "utm_source=spam",
      },
      referrers: {
        title: "来源",
        placeholder: "*.spam.example",
      },
      userAgents: {
        title: "User-Agent",
        placeholder: "*bot*",
      },
      ips: {
        title: "IP 地址",
        placeholder: "203.0.113.0/24",
      },
      asns: {
        title: "ASN",
        placeholder: "64500",
      },
      countries: {
        title: "国家/地区",
        placeholder: "DE",
      },
      regions: {
        title: "州/省",
        placeholder: "US-CA",
      },
    },
    ignoreDoNotTrackLabel: "忽略“请勿跟踪”",
    autoTrackOutboundLinksLabel: "自动跟踪外链点击",
    autoTrackOutboundLinksHint:
      "开启后，点击指向外部域名的链接将自动上报 outbound_click 事件。",
    performanceSampleRateLabel: "Web Vitals 采样率",
    performanceSampleRateHint:
      "被采样的访问会在离开页面时记录 TTFB、FCP、LCP、CLS 和 INP。填 0 表示不采样，100 表示全量采集。",
    save: "保存",
    saving: "保存中...",
    scriptHint: "将其粘贴到每个页面的 </head> 之前。",
    copyScript: "复制脚本",
    copiedScript: "脚本已复制。",
    scriptUnavailable: "当前无法获取脚本。",
    deleteTitle: "删除站点",
    deleteSubtitle: "删除该站点及其所有分析数据。",
    delete: "删除站点",
    deleting: "删除中...",
    deleteConfirm: "该操作不可撤销，是否继续？",
    toasts: {
      saved: "站点设置已保存。",
      saveFailed: "站点设置保存失败。",
      scriptLoadFailed: "加载脚本片段失败。",
      settingsLoadFailed: "加载脚本设置失败。",
      settingsPropagationHint: "更改最多需要一小时生效。",
      deleted: "站点已删除。",
      deleteFailed: "删除站点失败。",
      invalidInput: "请填写有效的站点名称和域名。",
    },
    publicEnabledHint: "任何拿到链接的人都可以查看此站点的报表。",
    viewBlockedRequests: "查看已拦截请求",
    blockingRulesHelp:
      "匹配“拦截”规则的请求不会被统计，“允许”用于设置例外。同一类型的多条规则都匹配时，以最后一条为准。可使用 * 作为通配符。",
    blockingRuleTypeLabel: "类型",
    blockingRuleActionLabel: "操作",
    blockingRuleValueLabel: "值",
    blockingRuleBlock: "拦截",
    blockingRuleAllow: "允许",
    blockingRuleAdd: "添加规则",
    blockingRuleRemove: "删除规则",
    blockingRulesEmpty: "没有拦截规则。",
    blockingRuleInvalid: "请输入此类型的有效值。",
    blockingRulesTooMany: "{type} 规则过多。",
  },
  accountSettings: {
    emailManagedByGateway: "邮箱来自你的 Every App 账户。",
    profileTitle: "个人信息",
    nicknameLabel: "昵称",
    nicknamePlaceholder: "例如：产品分析师",
    emailLabel: "邮箱",
    profileSaved: "个人信息已保存。",
    profileSaveFailed: "保存个人信息失败。",
    timeZoneTitle: "时区",
    browserUnavailable: "未检测到",
    useBrowser: "浏览器时区（{zone}）",
    saved: "时区已保存。",
    saveFailed: "无法保存时区。",
    timeZoneLabel: "报表时区",
    languageSaveFailed: "无法保存语言。",
  },
  notificationCenter: {
    title: "收件箱",
    empty: "暂无通知。",
    loading: "正在加载通知",
    markRead: "标记已读",
    markAllRead: "全部标记为已读",
    loadFailed: "加载通知失败。",
    markReadFailed: "标记通知为已读失败。",
    markAllReadSuccess: "通知已全部标记为已读。",
    markAllReadFailed: "全部标记为已读失败。",
    tabs: {
      all: "全部",
      unread: "未读",
    },
    severities: {
      info: "信息",
      success: "成功",
      warning: "警告",
      critical: "严重",
    },
    preferencesTitle: "通知偏好",
    emailNotificationsLabel: "邮件通知",
    reportsUnreadLabel: "新报告标为未读",
    milestonesUnreadLabel: "新里程碑标为未读",
    alertsUnreadLabel: "新提醒标为未读",
    preferencesSaveFailed: "保存通知偏好失败。",
    detailFields: {},
    noUnread: "没有未读通知。",
    emailFailed: "邮件发送失败",
  },
  notificationEmail: {
    common: {
      brand: "OpenAnalytics",
      date: "日期",
      coreMetrics: "核心指标",
      topPages: "热门页面",
      topReferrers: "主要来源",
      views: "浏览量",
      visitors: "访客数",
      sessions: "会话数",
      visits: "次访问",
      viewsUnit: "次浏览",
      direct: "直接访问",
      metric: "指标",
      window: "时间窗口",
      currentValue: "当前值",
      previousValue: "上期值",
      threshold: "阈值",
      milestone: "里程碑",
      change: "变化",
      mode: "模式",
      lastSeen: "最后收到数据",
      never: "从未收到",
      noPageData: "暂无页面数据。",
      noReferrerData: "暂无来源数据。",
      footer: "这封邮件由 OpenAnalytics 通知系统发送。",
      fallbackSubject: "OpenAnalytics 通知",
      trackingHint: "请检查统计脚本是否正常安装，或确认站点是否仍有流量。",
      severity: {
        info: "信息",
        success: "成功",
        warning: "警告",
        critical: "严重",
      },
    },
    test: {
      subject: "OpenAnalytics 通知测试",
      title: "OpenAnalytics 通知测试",
      summary: "这是一条来自 OpenAnalytics 的测试通知。",
      body: "这是一条来自 OpenAnalytics 的测试通知。如果邮件已配置并启用，它也会验证 Resend 投递是否正常。",
    },
    report: {
      subject: "{site} {periodLabel}访问报告",
      title: "{site} {periodLabel}访问报告",
      summary: "{date}：{visitors} 位访客，{views} 次浏览。",
      periodLabels: {
        daily: "每日",
        weekly: "每周",
        monthly: "每月",
        quarterly: "每季度",
        yearly: "每年",
      },
    },
    milestone: {
      subject: "{site} 达到 {bucket} {metric}",
      title: "{site} 达到 {bucket} {metric}",
      summary: "已达到流量里程碑：{bucket} {metric}。",
    },
    threshold: {
      subject: "{site} 访问量达到阈值",
      title: "{site} 访问量达到阈值",
      summary: "{window}的{metric}为 {value}，已匹配阈值 {operator} {target}。",
      metricLabels: {
        views: "浏览量",
        visitors: "访客数",
        sessions: "会话数",
      },
      windows: {
        last_1h: "过去 1 小时",
        last_24h: "过去 24 小时",
        yesterday: "昨天",
      },
    },
    health: {
      subject: "{site} 已超过 {hours} 小时没有收到访问数据",
      title: "{site} 已超过 {hours} 小时没有收到访问数据",
      noHistory: "当前没有历史访问数据。请检查统计脚本是否已正确安装。",
    },
    change: {
      subject: "{site} 流量变化提醒",
      title: "{site} 流量变化提醒",
      summary: "{window}的{metric}变化了 {change}。",
    },
  },
  runtimeConfigError: {
    title: "仪表盘不可用",
    heading: "此仪表盘暂时不可用。",
    setupSummary: "配置此部署",
    setupCommand: "用这条命令设置根密钥，然后刷新此页面。",
    docsLabel: "部署指南",
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
    notFoundTitle: "找不到这个页面",
    notFoundDescription: "地址可能不正确，或者页面已经被移动。",
    errorTitle: "页面出现了问题",
    errorDescription: "OpenAnalytics 无法完成这次请求。",
    homeAction: "返回首页",
    reportAction: "在 GitHub 反馈",
  },
  actions: {
    switchToEnglish: "English",
    switchToChinese: "简体中文",
    switchToTraditionalChinese: "繁體中文",
    switchToJapanese: "日本語",
    switchToLight: "浅色",
    switchToDark: "深色",
  },
  teamSelect: {
    groups: {},
    cancel: "取消",
  },
  teamManagement: {
    stats: {},
    toasts: {},
    sites: {
      aggregateTitle: "总访问量",
      openAnalytics: "查看分析",
      title: "所有站点",
      pagesPerSession: "每会话页面数",
      public: "公开",
      openPublic: "打开公开仪表盘",
    },
    widgets: {},
    notifications: {
      empty: "还没有通知规则。",
      rulesTitle: "通知规则",
      enabledCount: "此组织已启用 {count} 条规则。",
      loadingRules: "正在加载通知规则",
      deliveryTestTitle: "投递测试",
      deliveryTestDescription:
        "为你创建一条站内通知；如果可用，也会尝试发送邮件。",
      inAppTestHint: "我们会向你发送一条站内通知。",
      emailTestConfiguredHint: "我们会向你发送一条测试邮件。",
      emailTestUnconfiguredHint: "此 Every App 网关尚未设置邮件。",
      sendTestNotification: "发送测试通知",
      loadRulesFailed: "加载通知规则失败。",
      testNotificationSent: "测试通知已发送。",
      sendTestNotificationFailed: "发送测试通知失败。",
      createRule: "创建规则",
      editRule: "编辑规则",
      dialogDescription: "为此组织设置一条通知规则。",
      ruleInfoSection: "规则信息",
      scheduleSection: "计划",
      sendScheduleSection: "发送时间",
      checkSection: "检查频率",
      conditionSection: "条件",
      deliverySection: "投递",
      summarySection: "摘要",
      liveSummaryDescription: "实时确认这条规则会如何运行。",
      nameLabel: "名称",
      siteLabel: "站点",
      chooseSite: "选择站点",
      ruleTypeLabel: "规则类型",
      recipientLabel: "接收人",
      enabledLabel: "启用",
      enabledHint: "运行这条规则",
      scheduleLabel: "计划",
      timeLabel: "时间",
      timezoneLabel: "时区",
      intervalLabel: "间隔",
      dayLabel: "星期",
      dayOfMonthLabel: "日期",
      monthLabel: "月份",
      reportPeriodLabel: "报告周期",
      milestoneEveryLabel: "每个里程碑",
      matchLabel: "匹配",
      matchAll: "全部",
      matchAny: "任一",
      changeValueLabel: "变化值",
      changeModeLabel: "变化方式",
      changeModePercent: "百分比",
      changeModeAbsolute: "绝对值",
      addCondition: "添加条件",
      removeCondition: "移除",
      conditionItemTitle: "条件 {index}",
      metricLabel: "指标",
      windowLabel: "时间窗口",
      operatorLabel: "操作符",
      valueLabel: "阈值",
      cooldownLabel: "冷却时间",
      cooldownDescription: "在这段时间内，不会重复发送通知。",
      noDataHoursLabel: "无数据小时数",
      pleaseChooseSite: "请选择一个站点。",
      pleaseChooseRecipients: "请至少选择一个接收人。",
      ruleCreated: "规则已创建。",
      ruleUpdated: "规则已更新。",
      createRuleFailed: "创建规则失败。",
      updateRuleFailed: "更新规则失败。",
      deleteConfirm: "确认删除「{name}」？",
      ruleDeleted: "规则已删除。",
      deleteRuleFailed: "删除规则失败。",
      lastChecked: "上次检查",
      actions: "操作",
      edit: "编辑",
      enable: "启用",
      disable: "停用",
      delete: "删除",
      saveRule: "保存规则",
      preview: "预览",
      runNow: "立即运行",
      previewFailed: "预览规则失败。",
      runFailed: "运行规则失败。",
      runResultToast:
        "已创建 {messages} 条消息。邮件发送 {sent} 条，失败 {failed} 条。",
      previewDialogTitle: "规则预览",
      previewDialogDescription: "仅评估规则，不创建消息，也不发送邮件。",
      coolingDownUntil: "冷却至 {time}",
      scheduleDaily: "每天 {time}",
      scheduleWeekly: "每周{day} {time}",
      scheduleMonthly: "每月 {day} 日 {time}",
      scheduleQuarterly: "每季度 {day} 日 {time}",
      scheduleYearly: "每年 {month}/{day} {time}",
      scheduleInterval: "每 {minutes} 分钟",
      scheduleCustom: "自定义",
      conditionReport: "{period}报告",
      summaryWhenConditions: "当满足下列{combinator}条件时，发送{type}通知：",
      summaryWhenSingleCondition: "当满足此条件时，发送{type}通知：",
      summaryConditionThreshold: "{window}{metric}{operator}{value}",
      summaryConditionChange: "{window}{metric}{mode}变化{operator}{value}",
      summaryReportSchedule: "{period}：{schedule}",
      summaryMilestoneCondition: "{metric} 每达到 {step} 触发",
      summaryHealthCondition: "{hours} 小时无数据",
      defaultNames: {
        report: "{site} 每日报告",
        milestone: "{site} 流量里程碑",
        threshold: "{site} 访问阈值",
        change: "{site} 流量变化",
        health: "{site} 健康检查",
      },
      columns: {
        name: "名称",
        type: "类型",
        site: "站点",
        recipient: "接收人",
        schedule: "计划",
        condition: "条件",
        nextRun: "下次运行",
        status: "状态",
      },
      status: {
        enabled: "已启用",
        disabled: "未启用",
      },
      nextRunStates: {
        disabled: "未启用",
        coolingDown: "冷却中",
        dueNow: "应立即运行",
      },
      previewFields: {
        status: "状态",
        summary: "摘要",
        title: "标题",
        htmlPreview: "HTML 预览",
        bodyText: "正文",
        createdAt: "创建时间",
        updatedAt: "更新时间",
        loadingContent: "正在加载实际报告内容",
        noHtmlPreview: "当前预览没有 HTML 内容。",
      },
      ruleTypes: {
        report: "报告",
        milestone: "里程碑",
        threshold: "阈值",
        change: "变化",
        health: "健康",
        test: "测试",
      },
      ruleTypeDescriptions: {
        report: "定期发送站点概览",
        milestone: "指标达到阶段值时通知",
        threshold: "指标高于或低于阈值时通知",
        change: "指标相对上个周期变化时通知",
        health: "长时间无数据时通知",
      },
      recipientModes: {
        creator: "创建者",
        team_admins: "组织管理员",
        all_team_members: "全部团队成员",
        users: "指定用户",
      },
      recipientKindLabel: "接收人类型",
      recipientPresetLabel: "预设",
      customRecipientsEmpty: "未选择接收人",
      noTeamMembers: "此组织还没有成员。",
      recipientKinds: {
        preset: "预设",
        custom: "自定义",
      },
      scheduleKinds: {
        daily: "每天",
        weekly: "每周",
        monthly: "每月",
        quarterly: "每季度",
        yearly: "每年",
        interval: "间隔",
      },
      reportPeriods: {
        daily: "日报",
        weekly: "周报",
        monthly: "月报",
        quarterly: "季度报告",
        yearly: "年报",
      },
      cooldownUnits: {
        minutes: "分钟",
        hours: "小时",
        days: "天",
      },
      intervalOptions: {
        every30Minutes: "每 30 分钟",
        everyHour: "每小时",
        every6Hours: "每 6 小时",
        every12Hours: "每 12 小时",
        everyDay: "每天",
        every7Days: "每 7 天",
        every30Days: "每 30 天",
      },
      weekDays: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
      metrics: {
        views: "浏览量",
        visitors: "访客",
        sessions: "会话",
      },
      windows: {
        last_1h: "最近 1 小时",
        last_24h: "最近 24 小时",
        yesterday: "昨天",
      },
      addSiteFirst: "请先添加站点。",
      deleteDescription: "此操作无法撤销。",
      previewStatuses: {
        skipped: "已跳过",
        checked: "未触发",
        triggered: "已触发",
      },
    },
    publicLinks: {
      copyLink: "复制链接",
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
    scheduledTasks: {
      empty: "暂无定时任务。",
      refresh: "刷新",
      loadFailed: "加载定时任务失败。",
      loadMore: "加载更多",
      allStatuses: "全部状态",
      runs24h: "24 小时内运行次数",
      successRate24h: "24 小时成功率",
      problemRuns24h: "异常运行次数",
      failed: "失败",
      partial: "部分完成",
      lastRun: "最近运行",
      staleRunning: "长时间未完成的运行",
      taskListTitle: "任务",
      task: "任务",
      schedule: "计划",
      enabled: "状态",
      enabledYes: "已启用",
      enabledNo: "未启用",
      taskStateSaved: "任务状态已更新。",
      taskStateSaveFailed: "更新任务状态失败。",
      lastStatus: "最近状态",
      runs30d: "30 天运行",
      successRate30d: "30 天成功率",
      avgDuration: "平均耗时",
      runHistoryTitle: "运行历史",
      nextRun: "下次运行",
      noRuns: "暂无运行记录。",
      scheduledAt: "计划时间",
      startedAt: "开始时间",
      finishedAt: "结束时间",
      trigger: "触发",
      tasks: "任务",
      taskCount: "任务数",
      subtaskCount: "子任务数",
      taskResult: "任务结果",
      statusLabel: "状态",
      duration: "耗时",
      sites: "站点",
      hours: "小时",
      rows: "行数",
      rulesScanned: "规则",
      messagesCreated: "消息",
      emailFailed: "邮件失败",
      logs: "日志",
      viewLogs: "查看日志",
      logTitle: "运行日志",
      noRunSelected: "选择一条运行记录以查看日志。",
      noLogs: "暂无日志。",
      error: "错误",
      status: {
        running: "运行中",
        success: "成功",
        partial: "部分完成",
        failed: "失败",
        skipped: "已跳过",
      },
      taskDefinitions: {
        visit_hourly_rollup: {
          name: "小时访问聚合",
          description: "将已结束的访问汇总为每小时总计，供报表使用。",
          schedule: "每小时",
        },
        notification_tick: {
          name: "通知分发",
          description: "检查通知规则并分发消息。",
          schedule: "每 30 分钟",
        },
        database_maintenance: {
          name: "数据库优化",
          description: "清理过期的任务运行记录和通知，并优化数据库。",
          schedule: "每天",
        },
      },
      keptForDays: "保留 {days} 天",
    },
  },
  adminUsers: {
    columns: {},
  },
  adminSites: {
    createTitle: "添加站点",
    name: "名称（可选）",
    domain: "域名",
    create: "添加站点",
    creating: "添加中...",
    createSuccess: "站点已添加。",
    createFailed: "无法添加站点，请重试。",
    invalidDomain: "请输入域名，例如 example.com。",
    columns: {},
  },
  adminTeams: {
    columns: {},
  },
  requestObservation: {
    blockedTotal: "已拦截请求",
    retentionNote: "保留 30 天。放行的流量见各站点的仪表盘。",
    topReasons: "原因",
    recentTitle: "最近拦截的请求",
    categoryLabels: {
      custom_block: "拦截规则",
      bot: "机器人",
      suspected_bot: "托管网络",
    },
    tabs: {},
    refresh: "刷新",
    loadFailed: "无法加载被拦截的请求。",
    noData: "此期间没有被拦截的请求。",
    time: "时间",
    site: "站点",
    location: "位置",
    network: "网络",
    reason: "原因",
    userAgent: "User-Agent",
    emptyValue: "未知",
    pathname: "路径",
    country: "国家/地区",
    ipPrefix: "IP 前缀",
    botReasonLabels: {
      missing_ua: "缺少 User-Agent",
      ua_too_long: "User-Agent 过长",
      ua_isbot: "User-Agent 匹配机器人",
      script_ua: "脚本客户端 User-Agent",
      cf_bot_score_low: "Cloudflare Bot Score 偏低",
      cf_verified_bot_category: "Cloudflare 验证机器人类别",
      hosting_asn: "托管服务 ASN",
      network_service_asn: "网络服务 ASN",
      transit_asn: "中转网络 ASN",
      access_asn: "接入网络 ASN",
      missing_browser_provenance: "缺少浏览器来源信号",
      origin_hostname_mismatch: "Origin 与主机名不匹配",
      custom_block: "命中自定义屏蔽规则",
      blocked_domains: "命中域名屏蔽规则",
      blocked_paths: "命中路径屏蔽规则",
      blocked_query_parameters: "命中查询参数屏蔽规则",
      blocked_referrers: "命中引荐来源屏蔽规则",
      blocked_user_agents: "命中 User-Agent 屏蔽规则",
      blocked_ips: "命中 IP 屏蔽规则",
      blocked_asns: "命中 ASN 屏蔽规则",
      blocked_countries: "命中国家/地区屏蔽规则",
      blocked_regions: "命中区域屏蔽规则",
    },
    requestKindLabels: {},
    overviewLabels: {
      windowDays: "最近 {days} 天",
    },
    normalDetail: {},
  },
  systemSettings: {
    notificationEmailTitle: "邮件通知",
    emailGatewayNotReady: "此 Every App 网关尚未设置邮件。",
    emailSenderLabel: "发件人",
    retentionTitle: "运行数据保留期",
    retentionDescription:
      "配置任务运行记录、任务日志、通知消息和详细分析数据的保留时间。任务和通知的修改只影响新建记录；超出新期限的详细分析数据会在下一次每日运行时删除。",
    scheduledTaskLogsDaysLabel: "计划任务运行记录和日志（天）",
    notificationTestDaysLabel: "测试通知（天）",
    notificationAttentionDaysLabel: "警告和严重通知（天）",
    notificationDefaultDaysLabel: "其他通知（天）",
    analyticsDetailDaysLabel:
      "详细分析数据：页面浏览和事件（天；保留每小时汇总）",
    retentionRangeHint: "请输入 1 到 3650 之间的整数天数。",
    retentionSave: "保存保留期配置",
    retentionSaving: "保存中...",
    retentionSaved: "保留期配置已保存。",
    retentionSaveFailed: "保存保留期配置失败。",
    enabledOn: "开启",
    enabledOff: "关闭",
    cancel: "取消",
    retentionLowerTitle: "删除较早的分析数据？",
    retentionLowerDescription:
      "超过 {days} 天的页面浏览和事件会在下一次每日运行时删除，小时汇总会保留。此操作无法撤销。",
    retentionLowerConfirm: "保存并删除",
  },
  systemPerformance: {
    refresh: "刷新",
    loadFailed: "无法加载接收数据。",
    noData: "此期间没有接收数据。",
    range15m: "最近 15 分钟",
    range1h: "最近 1 小时",
    range6h: "最近 6 小时",
    range24h: "最近 24 小时",
    totalEvents: "已接收事件",
    p95Latency: "P95 估算延迟",
    p50Latency: "P50",
    p75Latency: "P75",
    p50Label: "P50",
    p75Label: "P75",
    p95Label: "P95",
    dataFreshness: "数据新鲜度",
    noRecentWrite: "暂无最近写入",
    clockAnomalies: "时钟/延迟异常",
    delayed: "延迟",
    future: "未来时间戳",
    latencyPercentileTrend: "延迟分位趋势",
    latencyPercentileTrendDescription:
      "查看接收事件的 P50、P75、P95 估算延迟。",
    throughputTrend: "已接收事件吞吐",
    throughputTrendDescription: "查看接收事件的吞吐情况。",
    visits: "访问",
    customEvents: "自定义事件",
    anomalyBucket: "异常分桶",
    openVisitHealth: "未关闭访问堆积",
    openVisitHealthDescription: "尚未结束的访问。",
    open: "未关闭",
    stale: "停滞",
    timedOut: "已超时",
    oldestOpen: "最早未关闭",
    latestActivity: "最近活动",
    latencySampleHealth: "延迟样本健康度",
    latencySampleHealthDescription: "查看可信事件的延迟情况。",
    trustedSamples: "可信样本",
    topSitesTitle: "系统负载最高的站点",
    topSitesDescription: "当前接收事件数量最多的站点。",
    events: "事件",
    avgLatency: "平均延迟",
    slowestEventsTitle: "估算最慢事件",
    slowestEventsDescription: "从发生到保存延迟最长的事件。",
    eventTime: "事件时间",
    serverTime: "服务端写入时间",
    estimatedDelay: "估算延迟",
    doDiagnosticTitle: "缓冲数据",
    doDiagnosticDescription: "检查每个站点尚未保存的数据。",
    doDiagnosticLoadFailed: "无法检查缓冲数据。",
    doDiagnosticLoading: "正在检查每个站点…",
    doDiagnosticRun: "检查缓冲数据",
    doDiagnosticEmpty: "暂无缓冲数据。",
    doDiagnosticUnreachable: "不可达站点",
    doDiagnosticReachableSites: "可达站点",
    doDiagnosticTotalSites: "总站点",
    doDiagnosticActiveAlarms: "活跃 Alarm 定时器",
    doDiagnosticBufferedVisits: "缓冲访问",
    doDiagnosticOpenVisits: "缓冲未关闭访问行",
    doDiagnosticOpenStale: "未关闭且停滞 >30 分钟",
    doDiagnosticOpenTimedOut: "未关闭且停滞 >12 小时",
    doDiagnosticOpenHardAged: "开始时间超过 36 小时",
    doDiagnosticOpenFutureSkew: "未来时间戳",
    doDiagnosticStuckDirty: "未刷新且卡住",
    doDiagnosticMaxFlushAttempts: "最大重试次数",
    doDiagnosticBufferedCustomEvents: "缓冲自定义事件",
    doDiagnosticOldestOpen: "最早未关闭的访问",
    doDiagnosticFutureMaxActivity: "最晚的未来活动时间",
    doDiagnosticSiteList: "风险最高的站点",
    doDiagnosticSiteListDescription: "风险最高的 20 个站点。",
    doDiagnosticSiteFailed: "不可达",
    doDiagnosticSiteOpen: "未关闭",
    doDiagnosticSiteStuck: "卡滞",
    doDiagnosticSiteFuture: "未来时间戳",
    doDiagnosticSiteHardAged: "超龄",
    doDiagnosticSiteAlarm: "Alarm 状态",
    doDiagnosticSiteAlarmNone: "无",
    doDiagnosticSiteAlarmDue: "到期",
    doDiagnosticSiteNextDue: "下一次到期",
    doDiagnosticSiteNextDueFlush: "Flush",
    doDiagnosticSiteNextDueHidden: "隐藏回退",
    doDiagnosticSiteNextDueTimeout: "访问超时",
    doDiagnosticSiteResponseMs: "响应耗时",
    doDiagnosticHealthy: "当前未发现异常缓冲行。",
  },
  loginForm: {},
  logoutAction: {},
  sidebarFooter: {
    gateway: "返回 Every App",
  },
  appNav: {
    appearance: "外观",
    mainNavigation: "主导航",
    toggleSidebar: "切换侧边栏",
    sources: "来源",
    audience: "受众",
    goals: "目标",
    sites: "站点",
    allSites: "所有站点",
    inbox: "收件箱",
    settings: "设置",
    switchSite: "切换站点",
    siteSettings: "站点设置",
    addSite: "添加站点",
    sections: "分区",
  },
  teamEntry: {},
  getStarted: {
    title: "开始使用",
    progress: "{done} / {total}",
    showSteps: "显示步骤",
    hideSteps: "隐藏步骤",
    completed: "已完成 {count} 项",
    steps: {
      site: "添加第一个站点",
      tracking: "跟踪你的网站",
      team: "邀请成员",
      notifications: "通过邮件接收报告",
      sharing: "分享公开仪表盘",
    },
    noSitesTitle: "添加第一个站点",
    memberNoSitesTitle: "还没有站点",
    memberNoSitesDescription: "请让管理员添加一个。",
    addSite: "添加站点",
    waitingTitle: "正在等待第一次页面浏览",
    copy: "复制",
    copied: "已复制",
  },
  settingsNav: {
    label: "设置",
    system: "系统健康",
    account: "账户",
    notifications: "通知",
    cancel: "取消",
  },
  systemHealth: {
    tabs: {
      tasks: "计划任务",
      blocked: "已拦截请求",
      ingestion: "数据接收",
      data: "数据",
    },
  },
} as AppMessages;

const zhTwMessages = {
  appName: "OpenAnalytics",
  uiGallery: {
    categories: {},
  },
  navigation: {
    overview: "總覽",
    realtime: "即時",
    pages: "頁面",
    referrers: "來源",
    events: "事件",
    funnels: "目標與漏斗",
    campaigns: "推廣",
    visitors: "訪客",
    retention: "留存",
    geo: "位置",
    devices: "裝置",
    performance: "效能",
    settings: "站點設定",
  },
  common: {
    deviceLabels: {
      desktop: "電腦端",
      mobile: "行動裝置",
      tablet: "平板電腦",
    },
    timeRelativePair: "{absolute}（{relative}）",
    id: "ID",
    views: "瀏覽量",
    sessions: "工作階段數",
    visitors: "訪客數",
    bounceRate: "跳出率",
    avgDuration: "平均停留時長",
    path: "路徑",
    title: "標題",
    hostname: "主機名稱",
    referrerHost: "來源主機",
    entryPage: "入口頁面",
    exitPage: "出口頁面",
    referrer: "來源",
    event: "事件",
    location: "地區",
    browser: "瀏覽器",
    operatingSystem: "作業系統",
    deviceType: "裝置型別",
    country: "國家",
    region: "地區",
    regionCode: "地區程式碼",
    city: "城市",
    continent: "大洲",
    latitude: "緯度",
    longitude: "經度",
    continentLabels: {
      AF: "非洲",
      AN: "南極洲",
      AS: "亞洲",
      EU: "歐洲",
      NA: "北美洲",
      OC: "大洋洲",
      SA: "南美洲",
      AFRICA: "非洲",
      ANTARCTICA: "南極洲",
      ASIA: "亞洲",
      EUROPE: "歐洲",
      "NORTH AMERICA": "北美洲",
      OCEANIA: "大洋洲",
      "SOUTH AMERICA": "南美洲",
    },
    timezone: "時區",
    organization: "運營商組織",
    screenSize: "螢幕大小",
    loading: "載入中",
    noData: "暫無資料",
    loadFailed: "無法載入",
    retry: "重試",
    filteredEmpty: "沒有符合這些篩選條件的資料",
    clearFilters: "清除篩選",
    trend: "趨勢",
    unknown: "未知",
    site: "站點",
    system: "系統",
    theme: "主題",
    language: "語言",
    search: "搜尋",
    open: "開啟",
    sortBy: "按 {label} 排序",
    change: "變化",
    new: "新增",
    tableExport: {
      action: "匯出",
      title: "匯出 CSV",
      description: "將表格資料下載為 CSV 檔案。",
      scopeLabel: "匯出範圍",
      currentTab: "目前標籤頁",
      allTabs: "全部標籤頁",
      rowsLabel: "資料",
      currentView: "目前顯示資料",
      rawRows: "原始資料",
      fileNameLabel: "檔名",
      download: "匯出 CSV",
      empty: "目前沒有可匯出的行。",
    },
    tableColumns: {
      action: "列設定",
      title: "設定表格列",
      description: "選擇要顯示的列，並拖動調整順序。",
      visible: "顯示的列",
      required: "必需",
      reset: "恢復預設",
      dragHint: "拖動調整順序",
      close: "關閉",
    },
    close: "關閉",
    sitesFiltered: "已篩選 {active} / {total} 個站點",
    cumulativeTraffic: "全部週期累計流量",
    cumulativeEvents: "全部週期累計事件",
  },
  ranges: {
    today: "今天",
    yesterday: "昨天",
    last7d: "最近 7 天",
    last30d: "最近 30 天",
    last90d: "最近 90 天",
    last12m: "最近 12 個月",
    custom: "自訂時間段",
  },
  intervals: {
    minute: "分鐘",
    hour: "小時",
    day: "日",
    week: "周",
    month: "月",
  },
  dashboardHeader: {
    interval: "時間間隔",
    compareButton: "對比",
    compareTitle: "對比設定",
    compareTimeLabel: "對比時間",
    compareCurrentPeriod: "目前週期",
    comparePreviousPeriod: "上一週期",
    compareFilterLabel: "對比篩選",
    compareFollowCurrentFilter: "跟隨目前篩選",
    compareCustomFilter: "自訂篩選",
    compareApply: "應用對比",
    compareCancel: "取消",
    filterButton: "篩選",
    filterButtonEvent: "篩選 (事件)",
    filterButtonSession: "篩選 (工作階段)",
    filterButtonVisitor: "篩選 (訪客)",
    customHint: "請選擇開始和結束日期。",
    customPendingEnd: "已選擇開始日期，請繼續選擇結束日期。",
    customApply: "應用日期範圍",
    filterTitle: "篩選條件",
    previousPeriod: "上個週期",
    nextPeriod: "下個週期",
    customSelectionSummary: "目前選擇：{from} 至 {to}（共 {days} 天）",
  },
  filters: {
    clear: "清除",
  },
  conditionDescription: {
    and: "且",
    or: "或",
    not: "不滿足（{description}）",
    emptyConditions: "尚未設定條件",
    emptyFilter: "尚未設定篩選條件",
    filterEquals: "{field} 為 {value}",
    filterNotEquals: "{field} 不為 {value}",
    filterAnyOf: "{field} 是以下任一值：{values}",
    filterNoneOf: "{field} 不屬於以下任一值：{values}",
    filterBetween: "{field} 介於 {from} 與 {to} 之間",
    filterContains: "{field} 包含 {value}",
    filterStartsWith: "{field} 以 {value} 開頭",
    filterEndsWith: "{field} 以 {value} 結尾",
    filterGreaterThan: "{field} 大於 {value}",
    filterGreaterThanOrEqual: "{field} 大於或等於 {value}",
    filterLessThan: "{field} 小於 {value}",
    filterLessThanOrEqual: "{field} 小於或等於 {value}",
    filterExists: "{field} 存在",
    filterNotExists: "{field} 不存在",
    filterIsNull: "{field} 為 NULL",
    filterNotNull: "{field} 不為 NULL",
    filterIsEmpty: "{field} 為空",
    filterNotEmpty: "{field} 不為空",
  },
  filterBuilder: {
    fieldGroups: {
      advanced: "高階",
      page: "頁面",
      session: "工作階段",
      visitor: "訪客",
      referrer: "來源與管道",
      campaign: "行銷活動",
      client: "客戶端",
      geography: "地理位置",
      event: "事件",
      acquisition: "獲客",
      device: "裝置",
      geo: "地理",
      performance: "效能",
      user: "使用者",
      time: "時間",
      aggregation: "聚合",
      calculation: "計算",
      relation: "行為關係",
    },
    fieldLabels: {
      "page.path": "頁面路徑",
      "page.title": "頁面標題",
      "page.collection": "頁面集合",
      "page.hostname": "頁面網域",
      "page.query": "查詢參數",
      "page.hash": "URL Hash",
      "session.entryPath": "入口頁面",
      "session.exitPath": "出口頁面",
      "referrer.domain": "來源網域",
      "referrer.url": "來源 URL",
      "traffic.channel": "流量管道",
      "utm.source": "UTM 來源",
      "utm.medium": "UTM 媒介",
      "utm.campaign": "UTM 活動",
      "utm.term": "UTM 關鍵詞",
      "utm.content": "UTM 內容",
      "client.browser": "瀏覽器",
      "client.browserVersion": "瀏覽器版本",
      "client.browserEngine": "瀏覽器引擎",
      "client.os": "作業系統",
      "client.osVersion": "作業系統版本",
      "client.deviceType": "裝置型別",
      "client.language": "語言",
      "client.screenSize": "螢幕尺寸",
      "geo.country": "國家 / 地區",
      "geo.region": "省 / 州 / 地區",
      "geo.city": "城市",
      "geo.continent": "大洲",
      "geo.timeZone": "時區",
      "geo.organization": "網路組織",
      "event.collection": "事件集合",
      "event.name": "事件名稱",
      "event.payload": "事件屬性",
      "page.durationMs": "頁面停留時長",
      "session.collection": "工作階段集合",
      "session.durationMs": "工作階段時長",
      "session.views": "頁面瀏覽數",
      "session.events": "事件數",
      "session.bounce": "是否跳出",
      "visitor.collection": "訪客集合",
      "visitor.sessions": "工作階段數",
      "visitor.views": "頁面瀏覽數",
      "visitor.events": "事件數",
      "performance.ttfbMs": "TTFB",
      "performance.fcpMs": "FCP",
      "performance.lcpMs": "LCP",
      "performance.cls": "CLS",
      "performance.inpMs": "INP",
      "user.id": "使用者 ID",
      "user.name": "使用者名稱",
      "client.screenWidth": "螢幕寬度",
      "client.screenHeight": "螢幕高度",
      "geo.isEU": "是否歐盟地區",
      time: "時間",
      "time(...)": "活動時間",
      $items: "週期中的專案",
      $span: "序列跨度",
      "$gap(...)": "步驟間隔",
      "$same(...)": "步驟共有值",
      "bucket(...)": "時間分桶",
      "window(...)": "相對時間視窗",
      "periods(...)": "週期分組",
      "count(...)": "計數",
      "first(...)": "第一個",
      "last(...)": "最後一個",
      "nth(...)": "第 N 個",
      "countDistinct(...)": "去重計數",
      "sum(...)": "求和",
      "avg(...)": "平均值",
      "min(...)": "最小值",
      "max(...)": "最大值",
      "add(...)": "相加",
      "sub(...)": "相減",
      "mul(...)": "相乘",
      "div(...)": "相除",
      "sequence(...)": "行為序列",
      "adjacent(...)": "連續序列",
      "without(...)": "排除中間行為",
    },
    operatorLabels: {
      eq: "等於",
      neq: "不等於",
      in: "屬於任一值",
      notIn: "不屬於任一值",
      contains: "包含",
      startsWith: "以此開頭",
      endsWith: "以此結尾",
      gt: "大於",
      gte: "大於或等於",
      lt: "小於",
      lte: "小於或等於",
      between: "介於兩者之間",
      exists: "存在",
      notExists: "不存在",
      isNull: "為 NULL",
      notNull: "不為 NULL",
      isEmpty: "為空字串",
      notEmpty: "不為空字串",
    },
    valueType: "值型別",
    valueKinds: {
      string: "文字",
      enum: "列舉",
      number: "數字",
      boolean: "布林值",
      date: "日期",
      datetime: "日期和時間",
      "json-scalar": "JSON 標量",
    },
    booleanTrue: "是",
    booleanFalse: "否",
    valueUnset: "(未設定)",
    valueLoading: "正在載入值",
    valueSearchPlaceholder: "搜尋或輸入值",
    valueListPlaceholder: "搜尋或輸入值後按 Enter 新增",
    removeValue: "移除篩選值「{value}」",
    rangeStartPlaceholder: "下限",
    rangeEndPlaceholder: "上限",
    unitAriaLabel: "顯示單位",
    durationUnit: "時間單位",
    units: {
      hours: "小時",
      minutes: "分鐘",
      seconds: "秒",
      milliseconds: "毫秒",
      percent: "%",
      perMille: "‰",
      pixels: "畫素",
    },
    jsonPointer: "JSON 指標",
    jsonPointerPlaceholder: "搜尋或輸入 JSON 指標",
    match: "比對方式",
    expression: "篩選表示式",
    expressionPlaceholder: "篩選表示式...",
    naturalLanguageDescription: "自然語言描述",
    expressionInvalid: "表示式無效，點選檢視語法幫助",
    expressionHelpTitle: "篩選表示式語法",
    expressionHelpDescription: "可在篩選運算式中使用的欄位和運算子。",
    expressionHelpSyntax: "語法",
    expressionHelpLogicDescription:
      "AND 的優先順序高於 OR。使用括號表達巢狀；AND(...) 和 OR(...) 可保留明確的單條件分組。",
    expressionHelpValues: "值",
    expressionHelpValuesDescription:
      "字串使用 JSON 雙引號；數字和布林值不加引號。集合使用 [值, 值]，between 必須使用兩個有序的值。",
    expressionHelpOperators: "可用運算子",
    expressionHelpUnaryOperators: "無需值的運算子",
    expressionHelpFields: "可用欄位",
    expressionHelpFieldType: "型別",
    expressionHelpFieldOperators: "運算子",
    expressionHelpOtherFields: "其他",
    expressionHelpContextTitle: "活動時間與上下文內建值",
    expressionHelpContextDescription:
      "小寫點分名稱表示已註冊欄位；大寫 PAGE、EVENT、SESSION 和 VISITOR 表示實體集合。在實體篩選器內，$.member 表示目前實體，-> 明確投影集合成員。@ 表示時間錨點；序列和週期篩選器還提供 $span、$gap 和 $items。",
    expressionHelpContextExamples:
      'time(last(PAGE)) gte @now-14d\nsequence([EVENT { $.name eq "signup" }, EVENT { $.name eq "purchase" }]) {\n  $span lte 14d AND $gap(1, 2) lte 7d AND $same($.payload("/productId"))\n} exists\nperiods(EVENT, 1w) { count($items) gte 3 } exists',
    advancedEditor: {
      not: "非",
      removeNot: "移除“非”",
      matchAll: "全部符合",
      matchAny: "任一符合",
      addCondition: "新增條件",
      addGroup: "新增分組",
      wrapInNot: "新增“非”",
      remove: "移除",
      condition: "條件",
      literalValue: "字面值",
      compareWithExpression: "與表示式比較",
      valuesAsJson: "篩選值（JSON）",
      scalarArrayHelp: "輸入由 JSON 標量值組成的陣列。",
      chooseValue: "選擇一個值",
      filterValue: "篩選值",
      durationAmount: "時間長度",
      jsonPointer: "事件載荷 JSON 指標",
      jsonPointerPlaceholder: "/屬性/路徑",
      entityMember: "實體成員",
      nthIndex: "第 N 項索引",
      fromStep: "起始步驟",
      toStep: "結束步驟",
      occurrenceKind: "活動選擇方式",
      occurrenceEntity: "活動型別",
      occurrenceIndex: "活動序號",
      correlationTarget: "每個步驟共有的值",
      periodItemCount: "每個週期的專案數",
      nestedTooDeep: "表示式巢狀過深。",
      applyOffset: "應用偏移量",
      removeStep: "移除步驟",
      addStep: "新增序列步驟",
      excludedActivity: "排除的活動",
      fixedTime: "固定時間",
      toggleOffsetSign: "切換時間偏移正負",
      timeUnits: {
        milliseconds: "毫秒",
        seconds: "秒",
        minutes: "分鐘",
        hours: "小時",
        days: "天",
        weeks: "周",
        months: "月",
        years: "年",
      },
      coreRelation: "高階篩選",
      coreRelationExpression: "高階篩選表示式",
      structuredEditor: "高階篩選控制元件",
      unavailableForObservation: "Goal 和 Funnel 步驟不支援高階篩選。",
      targetKinds: {
        time: "時間",
        field: "欄位",
        "event-payload": "事件載荷",
        "entity-root": "實體集合",
        "context-root": "上下文",
        "context-intrinsic": "上下文內建值",
        "occurrence-time": "活動時間",
        member: "成員",
        selector: "選擇器",
        projection: "投影",
        reducer: "歸約器",
        arithmetic: "算術表示式",
        duration: "時間長度",
        "time-anchor": "相對時間",
        "sequence-span": "序列跨度",
        "sequence-gap": "步驟間隔",
        "sequence-same": "序列共有值",
        "period-items": "週期專案",
        bucket: "時間桶",
        window: "時間視窗",
        periods: "週期集合",
        sequence: "序列",
        adjacent: "相鄰序列",
        without: "排除活動的序列",
      },
    },
    savedFiltersLoading: "正在取得已儲存的篩選...",
    noSavedFilter: "不使用已儲存的篩選",
    systemPresets: "系統預設",
    advanced: "進階",
    systemPresetScopes: {
      preserve: "保留目前範圍",
      event: "事件範圍",
      session: "工作階段範圍",
      visitor: "訪客範圍",
    },
    systemPresetItems: {
      directTraffic: {
        name: "直接造訪",
        description: "沒有外部來源的造訪。",
      },
      organicSearchDiscovery: {
        name: "自然搜尋發現",
        description: "沒有行銷活動標記的搜尋引擎來源造訪。",
      },
      campaignTaggedTraffic: {
        name: "帶活動標記的流量",
        description: "帶有活動來源、媒介或名稱的造訪。",
      },
      mobileTraffic: {
        name: "行動裝置流量",
        description: "來自行動裝置的造訪。",
      },
      bouncedSessions: {
        name: "跳出工作階段",
        description: "只包含一次頁面瀏覽的工作階段。",
      },
      returningVisitors: {
        name: "回訪訪客",
        description: "至少擁有兩個工作階段的訪客。",
      },
    },
    savedFiltersPersonal: "個人篩選",
    savedFiltersTeam: "組織篩選",
    savedFiltersAuthor: "作者：{name}",
    savedFiltersPrivate: "個人",
    savedFiltersTeamShared: "已與組織共享",
    saveThisFilter: "儲存此篩選",
    saveAsThisFilter: "另存此篩選",
    manageThisFilter: "管理此篩選",
    finishEditingFilter: "完成編輯",
    createSavedFilter: "儲存篩選",
    manageSavedFilter: "管理篩選",
    savedFilterName: "名稱",
    savedFilterDescription: "備註",
    scopeLabel: "篩選範圍",
    scopeAuto: "根據目前頁面自動選擇",
    scopeEvent: "篩選符合目前條件的事件",
    scopeSession: "篩選滿足這些條件的工作階段",
    scopeVisitor: "篩選滿足這些條件的訪客",
    savedFilterVisibility: "可見性",
    savedFilterVisibilityPrivate: "僅自己可見",
    savedFilterVisibilityTeam: "與組織共享",
    savedFilterCreateDescription: "儲存目前的篩選表示式，以便之後再次套用。",
    savedFilterManageDescription: "更新此篩選的基本資訊，或開始編輯篩選條件。",
    editSavedFilter: "修改此篩選",
    deleteSavedFilter: "刪除此篩選",
    deleteSavedFilterTitle: "刪除此篩選？",
    deleteSavedFilterDescription:
      "刪除後無法恢復，組織中的其他成員也將無法再使用它。",
    savedFilterCancel: "取消",
    savedFilterSave: "儲存",
    savedFilterSaving: "正在儲存...",
    savedFilterDelete: "刪除",
    savedFilterDeleting: "正在刪除...",
    savedFilterOperationFailed: "操作失敗，請稍後重試。",
    apply: "應用篩選",
    allConditions: "全部條件均滿足",
    anyCondition: "滿足任一條件",
    condition: "條件 {index}",
    group: "組 {index}",
    invertCondition: "反轉此條件",
    exclude: "排除",
    addGroup: "新增分組",
    invalid: "請先完成每一條篩選條件。",
  },
  realtime: {
    title: "即時",
    logTitleSeparator: "：",
    activeNow: "目前線上",
    liveCount: "{count} 人在線",
    liveMetrics: "目前線上 / 近 30 分鐘訪客 / 近 30 分鐘瀏覽量",
    connected: "已連線",
    connecting: "連線中",
    reconnecting: "重連中",
    failed: "連線失敗",
    recentEvents: "即時事件",
    enterPage: "進入頁面",
    leavePage: "退出頁面",
    viewPage: "瀏覽頁面",
    customEvent: "自訂事件",
    detailsTitle: "事件詳情",
    browsingSection: "瀏覽",
    geographySection: "地理位置",
    sourceSection: "來源",
    statusLabels: {
      active: "活躍",
      completed: "已完成",
      open: "進行中",
      complete: "已完成",
      hidden_pending: "等待隱藏確認",
    },
    visibilityStateLabels: {
      visible: "可見",
      hidden: "隱藏",
    },
    visibilityVisible: "頁面變為可見",
    visibilityHidden: "頁面變為不可見",
    visibilityChange: "頁面可見性變化",
    visitorHistorySection: "訪客記錄",
    visitorHistorySubtitle: "檢視該訪客在目前即時視窗內的全部造訪記錄。",
    visitorHistoryRange: "瀏覽時間",
    visitorHistoryEmpty: "目前還沒有更多該訪客的造訪記錄。",
    visitorMapUnavailable: "目前事件沒有可用的定位座標。",
    visitorId: "訪客 ID",
    sessionId: "工作階段 ID",
    visitId: "造訪 ID",
    eventTime: "事件時間",
    eventKind: "事件種類",
    eventName: "事件名稱",
    traceId: "追蹤 ID",
    receivedAt: "接收時間",
    startedAt: "開始時間",
    previousVisitStartedAt: "上一次造訪開始時間",
    userId: "使用者 ID",
    userName: "使用者名稱",
    isEU: "歐盟訪客",
    queryString: "查詢字串",
    utmSource: "UTM 來源",
    utmMedium: "UTM 媒介",
    utmCampaign: "UTM 活動",
    utmTerm: "UTM 關鍵詞",
    utmContent: "UTM 內容",
    browserVersion: "瀏覽器版本",
    osVersion: "作業系統版本",
    userAgent: "User-Agent",
    postalCode: "郵政編碼",
    metroCode: "都會區編碼",
    status: "狀態",
    visibilityState: "可見性狀態",
    endedAt: "結束時間",
    duration: "持續時間",
    durationSource: "持續時間來源",
    exitReason: "退出原因",
    leaveAt: "離開時間",
  },
  overview: {
    title: "總覽",
    trendTitle: "造訪趨勢",
    sourceTab: "來源",
    sourceDomainColumn: "來源（網域）",
    sourceLinkTab: "來源連結",
    sourceLinkColumn: "來源連結",
    channelTab: "管道",
    channelColumn: "管道",
    direct: "直接造訪",
    channelLabels: {
      direct: "直接造訪",
      organic_search: "自然搜尋",
      social: "社交媒體",
      paid_search: "付費搜尋",
      paid_social: "付費社交",
      display: "展示廣告",
      email: "郵件",
      affiliate: "聯盟/合作",
      referral: "外部引薦",
      campaign: "行銷活動",
      other: "其他",
    },
    searchInTab: "搜尋{tab}",
  },
  install: {
    title: "將指令碼加入你的網站",
    platforms: {
      html: "HTML",
      wordpress: "WordPress",
      shopify: "Shopify",
      nextjs: "Next.js",
      gtm: "Google 代碼管理工具",
    },
    steps: {
      html: "在每個頁面的 {tag} 之前貼上它。",
      wordpress:
        "用 WPCode 等頁首指令碼外掛加入，或貼到佈景主題 header.php 的 {tag} 之前。",
      shopify:
        "在「線上商店 → 佈景主題 → 編輯程式碼」中開啟 theme.liquid，貼到 {tag} 之前。",
      nextjs: "在 app/layout.tsx 的 {tag} 中貼上它。",
      gtm: "用它建立一個「自訂 HTML」代碼，觸發條件選「所有網頁」，然後發布。",
    },
    waiting: "正在等待第一次頁面瀏覽",
    received: "已收到第一次頁面瀏覽，報表將在一分鐘內更新。",
    firstViewsTitle: "第一批頁面瀏覽已到達！",
    nextReports: "透過電子郵件接收報告",
    nextInvite: "邀請成員",
    dismiss: "關閉",
  },
  pages: {
    title: "頁面",
    pagesPerSession: "每工作階段頁面數",
    changePercentColumnLabel: "{metric}變化（%）",
    changePointsColumnLabel: "{metric}變化（百分點）",
    percentagePointSuffix: "個百分點",
    untitled: "未命名頁面",
    empty: "尚無頁面",
    loadMoreError: "載入更多頁面失敗。",
    trendTitle: "頁面造訪趨勢",
    otherPages: "其他頁面",
    hashTab: "錨點",
    noHash: "無錨點",
    queryTab: "查詢參數",
    noQuery: "無查詢參數",
    eventTab: "事件",
    eventsMetric: "事件數",
    viewDetails: "檢視詳情",
  },
  referrers: {
    title: "來源",
    splitTitle: "來源拆分",
    breakdownTitle: "來源明細",
    externalLabel: "外部來源",
    longTail: "長尾來源",
    channelLongTail: "其他管道",
  },
  campaigns: {
    title: "推廣",
    tabSource: "UTM 來源",
    tabMedium: "媒介",
    tabCampaign: "活動",
    tabTerm: "關鍵詞",
    tabContent: "內容",
    notSet: "未設定",
    noTaggedTraffic: "此期間尚無帶 UTM 標籤的造訪",
    taggedLinkHint: "在連結中加入 UTM 標籤，例如",
  },
  sessions: {
    title: "工作階段",
    search: "搜尋工作階段...",
    started: "開始時間",
    sessionId: "工作階段 ID",
    visitor: "訪客",
    anonymous: "匿名訪客",
    entryPage: "入口頁面",
    exitPage: "出口頁面",
    duration: "時長",
    referrer: "來源",
    location: "地區",
    os: "作業系統",
    browser: "瀏覽器",
    device: "裝置",
    pageViews: "頁面瀏覽量",
    customEvents: "自訂事件",
    screenSize: "螢幕尺寸",
    exitTime: "退出時間",
    loadError: "無法載入工作階段資料。",
    empty: "目前時間範圍內沒有工作階段。",
  },
  sessionDetail: {
    anonymous: "匿名訪客",
    userId: "使用者 ID",
    userName: "使用者名稱",
    back: "返回工作階段",
    missing: "缺少 sessionId。",
    notFound: "沒有找到這個工作階段。",
    loadError: "無法載入工作階段詳細資訊。",
    active: "進行中",
    inactive: "已結束",
    status: "狀態",
    duration: "時長",
    screenViews: "頁面瀏覽量",
    events: "事件",
    bounce: "是否跳出",
    entryPath: "入口路徑",
    exitPath: "出口路徑",
    referrerName: "來源名稱",
    os: "作業系統",
    browser: "瀏覽器",
    device: "裝置",
    screen: "螢幕",
    yes: "是",
    no: "否",
    uniquePages: "不同頁面數",
    firstEvent: "首個事件",
    lastEvent: "最後事件",
    sessionStarted: "工作階段開始",
    pageview: "瀏覽頁面",
    exitPage: "退出頁面",
    customEvent: "自訂事件",
    eventTitleSeparator: "：",
    visitDetailsTitle: "造訪明細",
    visitDetailsSubtitle:
      "按發生順序展示該工作階段內的開始、頁面造訪、退出和自訂事件。",
    location: "位置",
    visitorId: "訪客 ID",
    sessionId: "工作階段 ID",
    referrerUrl: "來源連結",
    emptyEvents: "沒有事件記錄。",
    emptyCustomEvents: "暫無自訂事件",
    sincePrevious: "距上個事件",
    geoLocationTitle: "地理位置",
    performanceTitle: "目前工作階段效能",
    range: "範圍",
  },
  events: {
    title: "事件",
    detailTitle: "事件詳情",
    backToEvents: "返回事件總覽",
    totalEvents: "事件總數",
    eventTypes: "事件型別",
    sessions: "觸發工作階段",
    visitors: "觸發訪客",
    avgEventsPerSession: "平均事件/工作階段",
    shareOfAllEvents: "事件佔比",
    triggerCount: "觸發量",
    triggerVisitors: "觸發人數",
    trendTitle: "事件趨勢",
    topEvents: "事件排行",
    recordsTitle: "事件記錄",
    fieldsTitle: "事件載荷欄位",
    fieldsSubtitle: "選擇欄位後檢視其值分佈和中繼資料。",
    fieldValuesTitle: "欄位值",
    fieldValuesSubtitle: "展示目前欄位的記錄及出現次數，點選以進行篩選。",
    fieldValuesEmpty: "目前欄位暫無記錄。",
    payloadFilter: "篩選",
    payloadFilterTitle: "事件載荷篩選",
    payloadFilterSubtitle: "每行一個條件，可使用 == 或 != 組合篩選。",
    payloadFilterPlaceholder: 'path.value == "a"\nlevel != 0',
    payloadFilterApply: "應用篩選",
    payloadFilterClear: "清空篩選",
    payloadFilterInvalid: "無法解析篩選條件，請檢查欄位路徑、運算子和值。",
    expandField: "展開欄位",
    collapseField: "收起欄位",
    search: "搜尋事件名、ID、訪客、工作階段、頁面...",
    eventName: "事件名",
    eventId: "事件 ID",
    occurredAt: "發生時間",
    receivedAt: "接收時間",
    page: "頁面",
    context: "上下文",
    visitor: "訪客",
    visit: "造訪",
    referrer: "來源",
    location: "地區",
    browser: "瀏覽器",
    os: "作業系統",
    device: "裝置",
    payload: "事件載荷",
    nodeCount: "節點數",
    payloadFields: "事件載荷欄位",
    values: "值",
    nodes: "節點",
    occurrences: "出現次數",
    openVisitor: "開啟訪客",
    openSession: "開啟工作階段",
    integratingEvent: "正在整合事件 ({seconds}s)",
    copyJson: "複製 JSON",
    copiedJson: "JSON 已複製。",
    copyJsonFailed: "無法複製 JSON。",
    copyValue: "複製值",
    copiedValue: "值已複製。",
    copyValueFailed: "複製值失敗。",
    loadError: "無法載入事件資料。",
    detailNotFound: "未找到該事件記錄。",
    empty: "目前篩選範圍內沒有自訂事件。",
    noCustomEvents: "此期間尚無自訂事件",
    emptyFields: "目前事件暫無事件載荷欄位。",
    noEventName: "缺少事件名。",
    loading: "載入中",
    other: "其他",
  },
  funnels: {
    title: "漏斗",
    listTitle: "漏斗定義",
    conversionRecords: "轉換記錄",
    converted: "已轉換",
    dropped: "已流失",
    open: "開啟漏斗",
    moreActions: "更多操作",
    createTitle: "建立漏斗",
    nameLabel: "名稱",
    namePlaceholder: "註冊啟用",
    stepsLabel: "步驟",
    addStep: "新增步驟",
    removeStep: "移除步驟",
    progression: "計數依據",
    conversionWindow: "轉換視窗",
    custom: "自訂",
    customWindowHours: "自訂視窗（小時）",
    stepFilter: "步驟篩選",
    filter: "篩選",
    apply: "應用",
    condition: "個條件",
    conditions: "個條件",
    expression: "篩選表示式",
    filterPlaceholder: '例如 page.path eq "/pricing"',
    invalidFilter: "篩選無效",
    dragStep: "拖動步驟",
    unnamed: "（未命名）",
    oneHour: "1 小時",
    oneDay: "24 小時",
    sevenDays: "7 天",
    thirtyDays: "30 天",
    save: "建立",
    saveEdit: "儲存修改",
    edit: "編輯",
    editTitle: "編輯漏斗",
    creating: "建立中...",
    cancel: "取消",
    delete: "刪除",
    deleteTitle: "刪除漏斗",
    deleteDescription: "這會移除已儲存的漏斗定義，不會刪除歷史分析資料。",
    deleteConfirm: "刪除漏斗",
    deleting: "刪除中...",
    detailLoadError: "無法載入漏斗分析。",
    invalidFunnel: "請填寫名稱，並至少補全兩個篩選步驟。",
    created: "漏斗已建立。",
    createFailed: "建立漏斗失敗。",
    updatedSuccess: "漏斗已更新。",
    saveFailed: "儲存漏斗失敗。",
    deleted: "漏斗已刪除。",
    deleteFailed: "刪除漏斗失敗。",
    overallConversion: "總轉換率",
    startedSessions: "起始工作階段數",
    startedVisitors: "起始訪客數",
    convertedSessions: "轉換工作階段數",
    convertedVisitors: "轉換訪客數",
    largestDropOff: "最大流失",
    noDropOff: "無流失",
    step: "步驟",
    sessions: "工作階段",
    visitors: "訪客",
    conversion: "轉換率",
    stepConversion: "步驟轉換率",
    dropOff: "流失",
    updated: "更新於",
  },
  goals: {
    title: "目標分析",
    conversionRecords: "轉換記錄",
    open: "開啟目標",
    moreActions: "更多操作",
    createTitle: "建立目標",
    nameLabel: "名稱",
    namePlaceholder: "完成購買",
    filter: "轉換條件",
    apply: "應用",
    cancel: "取消",
    save: "建立",
    saveEdit: "儲存修改",
    edit: "編輯",
    editTitle: "編輯目標",
    creating: "建立中...",
    delete: "刪除",
    deleteTitle: "刪除目標",
    deleteDescription: "這會移除已儲存的目標定義，不會刪除歷史分析資料。",
    deleteConfirm: "刪除目標",
    detailLoadError: "無法載入目標分析。",
    invalidGoal: "請填寫名稱，並補全轉換條件。",
    created: "目標已建立。",
    updatedSuccess: "目標已更新。",
    saveFailed: "儲存目標失敗。",
    deleted: "目標已刪除。",
    deleteFailed: "刪除目標失敗。",
    sessions: "工作階段",
    visitors: "訪客",
    total: "總數",
    converted: "已轉換",
    conversion: "轉換率",
    timeseries: "轉換率",
    updated: "更新於",
  },
  conversions: {
    new: "新增",
    newGoal: "目標",
    newGoalDescription: "單一步驟，例如註冊",
    newFunnel: "漏斗",
    newFunnelDescription: "依序完成的多個步驟",
    empty: "尚無目標或漏斗",
    emptyMemberHint: "管理員可以建立。",
  },
  visitors: {
    title: "訪客",
    search: "搜尋訪客...",
    visitor: "訪客",
    anonymous: "匿名訪客",
    referrer: "來源",
    location: "地區",
    os: "作業系統",
    browser: "瀏覽器",
    device: "裝置",
    firstSeen: "首次造訪",
    lastSeen: "最近造訪",
    pageViews: "頁面瀏覽量",
    sessions: "工作階段數",
    customEvents: "自訂事件",
    screenSize: "螢幕尺寸",
    loadError: "無法載入訪客資料。",
    empty: "目前時間範圍內沒有訪客。",
  },
  visitorDetail: {
    anonymous: "匿名訪客",
    userId: "使用者 ID",
    userName: "使用者名稱",
    back: "返回訪客",
    missing: "缺少 visitorId。",
    notFound: "沒有找到這個訪客。",
    loadError: "無法載入訪客詳情。",
    totalDuration: "總時長",
    events: "事件",
    views: "頁面瀏覽量",
    uniquePages: "不同頁面數",
    avgPagesPerSession: "平均頁面/工作階段",
    avgEventsPerSession: "平均事件/工作階段",
    avgStay: "平均停留時長",
    firstSeen: "首次造訪",
    lastSeen: "最近造訪",
    daysActive: "活躍天數",
    avgTimeBetweenSessions: "平均工作階段間隔",
    activity: "活躍記錄",
    sessionRecords: "工作階段記錄",
    started: "開始時間",
    visitor: "訪客",
    duration: "時長",
    referrer: "來源",
    pageViews: "頁面瀏覽量",
    visitDetailsTitle: "造訪明細",
    visitDetailsSubtitle:
      "按發生順序展示該訪客的工作階段開始、頁面造訪、退出和自訂事件。",
    customEvents: "自訂事件",
    emptyEvents: "沒有事件記錄。",
    emptyCustomEvents: "暫無自訂事件",
    emptySessions: "沒有工作階段記錄。",
    visitorId: "訪客 ID",
    sessionId: "工作階段 ID",
    referrerName: "來源名稱",
    referrerUrl: "來源連結",
    location: "位置",
    browser: "瀏覽器",
    os: "作業系統",
    device: "裝置",
    screen: "螢幕",
    entryPath: "入口路徑",
    exitPath: "出口路徑",
    sessionStarted: "工作階段開始",
    pageview: "瀏覽頁面",
    exitPage: "退出頁面",
    customEvent: "自訂事件",
    eventTitleSeparator: "：",
    sincePrevious: "距上個事件",
    geoLocationTitle: "地理位置",
    performanceTitle: "目前訪客效能",
    range: "範圍",
  },
  retention: {
    title: "留存",
    cohortBy: "群組週期：{interval}",
    cohortDate: "群組日期",
    cohortSize: "人數",
    periodLabel: "第 {n} 期",
    matrixTitle: "留存矩陣",
    matrixSubtitle:
      "每一行是首次進入該週期的訪客群組，每一列是後續週期的回訪比例。",
    cohortsMetric: "群組數",
    visitorsMetric: "群組訪客",
    periodOneMetric: "首期回訪",
    averageReturnMetric: "平均回訪",
    strongestCohortMetric: "最佳群組",
    eligibleVisitors: "符合條件的訪客",
    periodsAnalyzed: "已分析週期",
    noEligibleCohorts: "暫無符合條件的群組",
    overallRetention: "整體留存",
    legendLow: "低",
    legendHigh: "高",
    periodZero: "初始",
    empty: "目前時間範圍內沒有足夠的回訪資料。",
    emptyHint: "在日期選單中選擇更長的時間範圍或更粗的時間間隔。",
    loadError: "無法載入留存資料。",
    unavailableCell: "該群組還沒有進入這個週期。",
    visitorsDetail: "訪客",
    rateDetail: "留存率",
    sizeDetail: "人數",
  },
  geo: {
    title: "位置",
    mapTitle: "訪客分布",
    countryLabel: "國家/地區",
    regionLabel: "州/省",
    cityLabel: "市/縣",
    back: "返回上一級",
    viewOnWikipedia: "檢視維基百科",
    investigationNotice: "這些資料來源於網路，可能存在錯誤。",
    timezoneDeltaVsLocal: "與本地時間相差 {delta}",
    visitorCoordinates: "訪客座標",
    ipNotice: "估算的 IP 位置，座標為粗略範圍，不代表精確家庭或辦公地址。",
    multipleNotice: "該訪客在不同工作階段中的旅程可能涉及多個城市。",
    investigation: {
      countryScopedLabel: "所屬國家的{label}",
      capital: "首都",
      population: "人口",
      gdp: "GDP",
      gdpPerCapita: "人均 GDP",
      marketPenetration: "市場滲透率",
      region: "所屬區域",
      currency: "貨幣",
      phonecode: "電話區號",
      timezone: "時區",
      type: "型別",
      iso: "ISO",
      coordinates: "座標",
      unavailable: "暫無",
      gdpValue: "{value} 百萬美元",
      gdpPerCapitaValue: "{value} 美元/人",
      gdpPerCapitaNearAverage: "{value} 美元/人（接近全球平均）",
      gdpPerCapitaAboveAverage: "{value} 美元/人（高於平均 {percent}%）",
      gdpPerCapitaBelowAverage: "{value} 美元/人（低於平均 {percent}%）",
      marketPenetrationWindow: "{label}({days}天)",
      timezoneCount: "{count} 個時區",
      typeLabels: {
        country: "國家",
        state: "州",
        province: "省",
        prefecture: "地級市",
        city: "市",
        county: "縣",
        district: "區",
        town: "鎮",
        village: "村",
        municipality: "市鎮",
        territory: "地區",
        section: "片區",
        adm1: "一級行政區",
        adm2: "二級行政區",
        adm3: "三級行政區",
        adm4: "四級行政區",
        adm5: "五級行政區",
      },
    },
  },
  devices: {
    title: "裝置",
    shareTitle: "訪客佔比",
    dimensions: {
      device: "裝置",
      os: "作業系統",
      browser: "瀏覽器",
      engine: "引擎",
      screenSize: "螢幕尺寸",
    },
    crossTabTitle: "交叉分析",
    crossTabRows: "列",
    crossTabColumns: "拆分依據",
    otherLabel: "其他",
    screenBucketLabels: {},
  },
  browsers: {
    otherLabel: "其他",
  },
  performance: {
    title: "效能",
    empty: "尚無 Web Vitals 資料",
    chartTitle: "效能趨勢",
    avgLabel: "平均值",
    samplesLabel: "樣本數",
    p50Label: "P50",
    p75Label: "P75",
    p95Label: "P95",
    ttfb: "首位元組時間",
    fcp: "首次內容繪製",
    lcp: "最大內容繪製",
    cls: "累積佈局偏移",
    inp: "互動到下一次繪製",
    ttfbDescription:
      "衡量瀏覽器在收到伺服器第一個位元組前等待了多久，反映後端響應、網路延遲和快取效果。",
    fcpDescription:
      "衡量頁面首次繪製文字或圖片的時間，反映訪客多久能看到頁面開始載入。",
    lcpDescription:
      "衡量視口內最大內容元素完成渲染的時間，是感知載入速度的核心指標。",
    clsDescription:
      "衡量頁面生命週期中非預期佈局位移的程度，數值越低表示視覺越穩定。",
    inpDescription:
      "衡量使用者互動到下一次繪製之間的延遲，反映頁面載入後的響應能力。",
    msUnit: "毫秒",
    secondsUnit: "秒",
    clsUnit: "分值",
    score: "體驗評分",
    scoreDescription:
      "將載入、穩定性和互動指標的 P75 數值合成為 0 到 100 的體驗評分，分數越高越好。",
    great: "優秀",
    needsImprovement: "需要改進",
    poor: "較差",
    datasetTitle: "門檻",
    interpretationTitle: "目前解讀",
    currentReading:
      "{metric} 目前 P75 為 {value}，體驗評分為 {score}，覆蓋 {samples} 個樣本。目前判定：{status}。",
    metricThresholdText:
      "優秀為不高於 {good}；需要改進為 {good} 到 {poor}；較差為高於 {poor}。",
    scoreThresholdText: "優秀為高於 90，需要改進為 50 到 90，較差為低於 50。",
    countryHealthTitle: "國家和地區健康度",
    countryHealthSubtitle: "根據 {metric} 對國家或地區邊界進行健康度著色。",
    pathsTitle: "路徑效能",
    pathsAnalyzedLabel: "已分析路徑",
    metricValueColumn: "P75 數值",
    statusColumn: "狀態",
  },
  share: {
    noData: "尚無資料",
  },
  siteSettings: {
    title: "站點設定",
    sections: {
      basic: {
        title: "一般",
      },
      tracking: {
        title: "追蹤",
      },
      blocking: {
        title: "攔截規則",
      },
      protection: {
        title: "防護",
      },
      danger: {
        title: "危險操作",
      },
      install: {
        title: "安裝",
      },
      advanced: {
        title: "進階",
      },
    },
    nameLabel: "名稱",
    domainLabel: "網域",
    publicSharingTitle: "分享",
    publicEnabledLabel: "公開看板",
    publicSlugLabel: "連結路徑",
    publicSlugPlaceholder: "例如 my-site",
    publicSlugHint: "連結中 /share/ 之後的部分。",
    publicLinkLabel: "公開連結",
    copiedLink: "連結已複製",
    trackingStrengthGroupTitle: "追蹤強度",
    trackingStrengthStrong: "強",
    trackingStrengthSmart: "智慧",
    trackingStrengthWeak: "弱",
    trackingStrengthStrongDescription:
      "始終進行針對訪客的高精度追蹤。這可能違反某些國家的法規，例如 GDPR。",
    trackingStrengthSmartDescription: "自動根據訪客所處國家切換追蹤強度。",
    trackingStrengthWeakDescription:
      "始終降低對訪客的追蹤精度。這可能導致同一訪客在不同時間造訪時被計數多次、且無法計算留存率。",
    botProtectionEnabledLabel: "機器人攔截",
    botProtectionEnabledHint:
      "開啟後攔截高置信度機器人請求；關閉後這類請求仍會計入統計。",
    hostingProxyBlockingEnabledLabel: "攔截託管/代理網路請求",
    hostingProxyBlockingEnabledHint: "攔截來自託管或代理網路的疑似機器人請求。",
    trackQueryParamsLabel: "追蹤查詢參數",
    trackHashLabel: "追蹤 URL 雜湊",
    blockingRulesSave: "儲存規則",
    blockingRulesDialogs: {
      searchButton: "搜尋",
      searchTitle: "搜尋地區",
      searchDescription: "依名稱或代碼搜尋，然後選擇結果。",
      searchInputLabel: "搜尋",
      searchInputPlaceholder: "按名稱或程式碼搜尋",
      searchCountryLabel: "國家 / 地區",
      searchRegionLabel: "州 / 省",
      searchBack: "更換國家 / 地區",
      searchLoading: "正在載入地區...",
      searchNoResults: "找不到符合條件的地區。",
      searchLoadError: "無法載入地區，請稍後重試。",
      searchClose: "關閉",
    },
    blockingRulesFields: {
      domains: {
        title: "網域",
        placeholder: "admin.example.com",
      },
      paths: {
        title: "路徑",
        placeholder: "/admin/*",
      },
      queryParameters: {
        title: "查詢參數",
        placeholder: "utm_source=spam",
      },
      referrers: {
        title: "來源",
        placeholder: "*.spam.example",
      },
      userAgents: {
        title: "User-Agent",
        placeholder: "*bot*",
      },
      ips: {
        title: "IP 位址",
        placeholder: "203.0.113.0/24",
      },
      asns: {
        title: "ASN",
        placeholder: "64500",
      },
      countries: {
        title: "國家/地區",
        placeholder: "DE",
      },
      regions: {
        title: "州/省",
        placeholder: "US-CA",
      },
    },
    ignoreDoNotTrackLabel: "忽略「請勿追蹤」",
    autoTrackOutboundLinksLabel: "自動追蹤外鏈點選",
    autoTrackOutboundLinksHint:
      "開啟後，點選指向外部網域的連結將自動回報 outbound_click 事件。",
    performanceSampleRateLabel: "Web Vitals 取樣率",
    performanceSampleRateHint:
      "被取樣的造訪會在離開頁面時記錄 TTFB、FCP、LCP、CLS 和 INP。填 0 表示不採樣，100 表示全量採集。",
    save: "儲存",
    saving: "儲存中...",
    scriptHint: "將其貼到每個頁面的 </head> 之前。",
    copyScript: "複製指令碼",
    copiedScript: "指令碼已複製。",
    scriptUnavailable: "目前無法取得指令碼。",
    deleteTitle: "刪除站點",
    deleteSubtitle: "刪除該站點及其所有分析資料。",
    delete: "刪除站點",
    deleting: "刪除中...",
    deleteConfirm: "該操作不可撤銷，是否繼續？",
    toasts: {
      saved: "站點設定已儲存。",
      saveFailed: "站點設定儲存失敗。",
      scriptLoadFailed: "載入指令碼片段失敗。",
      settingsLoadFailed: "載入指令碼設定失敗。",
      settingsPropagationHint: "變更最多需要一小時生效。",
      deleted: "站點已刪除。",
      deleteFailed: "刪除站點失敗。",
      invalidInput: "請填寫有效的站點名稱和網域。",
    },
    publicEnabledHint: "任何取得連結的人都可以查看此站點的報表。",
    viewBlockedRequests: "查看已攔截請求",
    blockingRulesHelp:
      "符合「攔截」規則的請求不會被統計，「允許」用於設定例外。同一類型的多條規則都符合時，以最後一條為準。可使用 * 作為萬用字元。",
    blockingRuleTypeLabel: "類型",
    blockingRuleActionLabel: "動作",
    blockingRuleValueLabel: "值",
    blockingRuleBlock: "攔截",
    blockingRuleAllow: "允許",
    blockingRuleAdd: "新增規則",
    blockingRuleRemove: "移除規則",
    blockingRulesEmpty: "沒有攔截規則。",
    blockingRuleInvalid: "請輸入此類型的有效值。",
    blockingRulesTooMany: "{type} 規則過多。",
  },
  accountSettings: {
    emailManagedByGateway: "電子郵件來自你的 Every App 帳戶。",
    profileTitle: "個人資訊",
    nicknameLabel: "暱稱",
    nicknamePlaceholder: "例如：產品分析師",
    emailLabel: "電子郵件",
    profileSaved: "個人資訊已儲存。",
    profileSaveFailed: "儲存個人資訊失敗。",
    timeZoneTitle: "時區",
    browserUnavailable: "未檢測到",
    useBrowser: "瀏覽器時區（{zone}）",
    saved: "時區已儲存。",
    saveFailed: "無法儲存時區。",
    timeZoneLabel: "報表時區",
    languageSaveFailed: "無法儲存語言。",
  },
  notificationCenter: {
    title: "收件匣",
    empty: "暫無通知。",
    loading: "正在載入通知",
    markRead: "標記已讀",
    markAllRead: "全部標記為已讀",
    loadFailed: "載入通知失敗。",
    markReadFailed: "標記通知為已讀失敗。",
    markAllReadSuccess: "通知已全部標記為已讀。",
    markAllReadFailed: "全部標記為已讀失敗。",
    tabs: {
      all: "全部",
      unread: "未讀",
    },
    severities: {
      info: "資訊",
      success: "成功",
      warning: "警告",
      critical: "嚴重",
    },
    preferencesTitle: "通知偏好",
    emailNotificationsLabel: "郵件通知",
    reportsUnreadLabel: "新報告標為未讀",
    milestonesUnreadLabel: "新里程碑標為未讀",
    alertsUnreadLabel: "新提醒標為未讀",
    preferencesSaveFailed: "儲存通知偏好失敗。",
    detailFields: {},
    noUnread: "沒有未讀通知。",
    emailFailed: "郵件傳送失敗",
  },
  notificationEmail: {
    common: {
      brand: "OpenAnalytics",
      date: "日期",
      coreMetrics: "核心指標",
      topPages: "熱門頁面",
      topReferrers: "主要來源",
      views: "瀏覽量",
      visitors: "訪客數",
      sessions: "工作階段數",
      visits: "次造訪",
      viewsUnit: "次瀏覽",
      direct: "直接造訪",
      metric: "指標",
      window: "時間視窗",
      currentValue: "目前值",
      previousValue: "上期值",
      threshold: "閾值",
      milestone: "里程碑",
      change: "變化",
      mode: "模式",
      lastSeen: "最後收到資料",
      never: "從未收到",
      noPageData: "暫無頁面資料。",
      noReferrerData: "暫無來源資料。",
      footer: "這封郵件由 OpenAnalytics 通知系統傳送。",
      fallbackSubject: "OpenAnalytics 通知",
      trackingHint: "請檢查統計指令碼是否正常安裝，或確認站點是否仍有流量。",
      severity: {
        info: "資訊",
        success: "成功",
        warning: "警告",
        critical: "嚴重",
      },
    },
    test: {
      subject: "OpenAnalytics 通知測試",
      title: "OpenAnalytics 通知測試",
      summary: "這是一條來自 OpenAnalytics 的測試通知。",
      body: "這是一條來自 OpenAnalytics 的測試通知。如果郵件已設定並啟用，它也會驗證 Resend 投遞是否正常。",
    },
    report: {
      subject: "{site} {periodLabel}造訪報告",
      title: "{site} {periodLabel}造訪報告",
      summary: "{date}：{visitors} 位訪客，{views} 次瀏覽。",
      periodLabels: {
        daily: "每日",
        weekly: "每週",
        monthly: "每月",
        quarterly: "每季度",
        yearly: "每年",
      },
    },
    milestone: {
      subject: "{site} 達到 {bucket} {metric}",
      title: "{site} 達到 {bucket} {metric}",
      summary: "已達到流量里程碑：{bucket} {metric}。",
    },
    threshold: {
      subject: "{site} 造訪量達到閾值",
      title: "{site} 造訪量達到閾值",
      summary: "{window}的{metric}為 {value}，已符合閾值 {operator} {target}。",
      metricLabels: {
        views: "瀏覽量",
        visitors: "訪客數",
        sessions: "工作階段數",
      },
      windows: {
        last_1h: "過去 1 小時",
        last_24h: "過去 24 小時",
        yesterday: "昨天",
      },
    },
    health: {
      subject: "{site} 已超過 {hours} 小時沒有收到造訪資料",
      title: "{site} 已超過 {hours} 小時沒有收到造訪資料",
      noHistory: "目前沒有歷史造訪資料。請檢查統計指令碼是否已正確安裝。",
    },
    change: {
      subject: "{site} 流量變化提醒",
      title: "{site} 流量變化提醒",
      summary: "{window}的{metric}變化了 {change}。",
    },
  },
  runtimeConfigError: {
    title: "儀表板無法使用",
    heading: "此儀表板暫時無法使用。",
    setupSummary: "設定此部署",
    setupCommand: "用這條命令設定根金鑰，然後重新整理此頁面。",
    docsLabel: "部署指南",
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
    notFoundTitle: "找不到這個頁面",
    notFoundDescription: "地址可能不正確，或者頁面已經被移動。",
    errorTitle: "頁面出現了問題",
    errorDescription: "OpenAnalytics 無法完成這次請求。",
    homeAction: "返回首頁",
    reportAction: "在 GitHub 反饋",
  },
  actions: {
    switchToEnglish: "English",
    switchToChinese: "簡體中文",
    switchToTraditionalChinese: "繁體中文",
    switchToJapanese: "日本語",
    switchToLight: "淺色",
    switchToDark: "深色",
  },
  teamSelect: {
    groups: {},
    cancel: "取消",
  },
  teamManagement: {
    stats: {},
    toasts: {},
    sites: {
      aggregateTitle: "總造訪量",
      openAnalytics: "檢視分析",
      title: "所有站點",
      pagesPerSession: "每工作階段頁面數",
      public: "公開",
      openPublic: "開啟公開儀表板",
    },
    widgets: {},
    notifications: {
      empty: "還沒有通知規則。",
      rulesTitle: "通知規則",
      enabledCount: "此組織已啟用 {count} 條規則。",
      loadingRules: "正在載入通知規則",
      deliveryTestTitle: "投遞測試",
      deliveryTestDescription:
        "為你建立一條站內通知；如果可用，也會嘗試傳送郵件。",
      inAppTestHint: "我們會向你傳送一條站內通知。",
      emailTestConfiguredHint: "我們會向你傳送一條測試郵件。",
      emailTestUnconfiguredHint: "此 Every App 閘道尚未設定郵件。",
      sendTestNotification: "傳送測試通知",
      loadRulesFailed: "載入通知規則失敗。",
      testNotificationSent: "測試通知已傳送。",
      sendTestNotificationFailed: "傳送測試通知失敗。",
      createRule: "建立規則",
      editRule: "編輯規則",
      dialogDescription: "為此組織設定一條通知規則。",
      ruleInfoSection: "規則資訊",
      scheduleSection: "計劃",
      sendScheduleSection: "傳送時間",
      checkSection: "檢查頻率",
      conditionSection: "條件",
      deliverySection: "投遞",
      summarySection: "摘要",
      liveSummaryDescription: "即時確認這條規則會如何執行。",
      nameLabel: "名稱",
      siteLabel: "站點",
      chooseSite: "選擇站點",
      ruleTypeLabel: "規則型別",
      recipientLabel: "接收人",
      enabledLabel: "啟用",
      enabledHint: "執行這條規則",
      scheduleLabel: "計劃",
      timeLabel: "時間",
      timezoneLabel: "時區",
      intervalLabel: "間隔",
      dayLabel: "星期",
      dayOfMonthLabel: "日期",
      monthLabel: "月份",
      reportPeriodLabel: "報告週期",
      milestoneEveryLabel: "每個里程碑",
      matchLabel: "比對",
      matchAll: "全部",
      matchAny: "任一",
      changeValueLabel: "變化值",
      changeModeLabel: "變化方式",
      changeModePercent: "百分比",
      changeModeAbsolute: "絕對值",
      addCondition: "新增條件",
      removeCondition: "移除",
      conditionItemTitle: "條件 {index}",
      metricLabel: "指標",
      windowLabel: "時間視窗",
      operatorLabel: "運算子",
      valueLabel: "閾值",
      cooldownLabel: "冷卻時間",
      cooldownDescription: "在這段時間內，不會重複傳送通知。",
      noDataHoursLabel: "無資料小時數",
      pleaseChooseSite: "請選擇一個站點。",
      pleaseChooseRecipients: "請至少選擇一個接收人。",
      ruleCreated: "規則已建立。",
      ruleUpdated: "規則已更新。",
      createRuleFailed: "建立規則失敗。",
      updateRuleFailed: "更新規則失敗。",
      deleteConfirm: "確認刪除「{name}」？",
      ruleDeleted: "規則已刪除。",
      deleteRuleFailed: "刪除規則失敗。",
      lastChecked: "上次檢查",
      actions: "操作",
      edit: "編輯",
      enable: "啟用",
      disable: "停用",
      delete: "刪除",
      saveRule: "儲存規則",
      preview: "預覽",
      runNow: "立即執行",
      previewFailed: "預覽規則失敗。",
      runFailed: "執行規則失敗。",
      runResultToast:
        "已建立 {messages} 條訊息。郵件傳送 {sent} 條，失敗 {failed} 條。",
      previewDialogTitle: "規則預覽",
      previewDialogDescription: "僅評估規則，不建立訊息，也不傳送郵件。",
      coolingDownUntil: "冷卻至 {time}",
      scheduleDaily: "每天 {time}",
      scheduleWeekly: "每週{day} {time}",
      scheduleMonthly: "每月 {day} 日 {time}",
      scheduleQuarterly: "每季度 {day} 日 {time}",
      scheduleYearly: "每年 {month}/{day} {time}",
      scheduleInterval: "每 {minutes} 分鐘",
      scheduleCustom: "自訂",
      conditionReport: "{period}報告",
      summaryWhenConditions: "當滿足下列{combinator}條件時，傳送{type}通知：",
      summaryWhenSingleCondition: "當滿足此條件時，傳送{type}通知：",
      summaryConditionThreshold: "{window}{metric}{operator}{value}",
      summaryConditionChange: "{window}{metric}{mode}變化{operator}{value}",
      summaryReportSchedule: "{period}：{schedule}",
      summaryMilestoneCondition: "{metric} 每達到 {step} 觸發",
      summaryHealthCondition: "{hours} 小時無資料",
      defaultNames: {
        report: "{site} 每日報告",
        milestone: "{site} 流量里程碑",
        threshold: "{site} 造訪閾值",
        change: "{site} 流量變化",
        health: "{site} 健康檢查",
      },
      columns: {
        name: "名稱",
        type: "型別",
        site: "站點",
        recipient: "接收人",
        schedule: "計劃",
        condition: "條件",
        nextRun: "下次執行",
        status: "狀態",
      },
      status: {
        enabled: "已啟用",
        disabled: "未啟用",
      },
      nextRunStates: {
        disabled: "未啟用",
        coolingDown: "冷卻中",
        dueNow: "應立即執行",
      },
      previewFields: {
        status: "狀態",
        summary: "摘要",
        title: "標題",
        htmlPreview: "HTML 預覽",
        bodyText: "正文",
        createdAt: "建立時間",
        updatedAt: "更新時間",
        loadingContent: "正在載入實際報告內容",
        noHtmlPreview: "目前預覽沒有 HTML 內容。",
      },
      ruleTypes: {
        report: "報告",
        milestone: "里程碑",
        threshold: "閾值",
        change: "變化",
        health: "健康",
        test: "測試",
      },
      ruleTypeDescriptions: {
        report: "定期傳送站點概覽",
        milestone: "指標達到階段值時通知",
        threshold: "指標高於或低於閾值時通知",
        change: "指標相對上個週期變化時通知",
        health: "長時間無資料時通知",
      },
      recipientModes: {
        creator: "建立者",
        team_admins: "組織管理員",
        all_team_members: "全部團隊成員",
        users: "指定使用者",
      },
      recipientKindLabel: "接收人型別",
      recipientPresetLabel: "預設",
      customRecipientsEmpty: "未選擇接收人",
      noTeamMembers: "此組織還沒有成員。",
      recipientKinds: {
        preset: "預設",
        custom: "自訂",
      },
      scheduleKinds: {
        daily: "每天",
        weekly: "每週",
        monthly: "每月",
        quarterly: "每季度",
        yearly: "每年",
        interval: "間隔",
      },
      reportPeriods: {
        daily: "日報",
        weekly: "週報",
        monthly: "月報",
        quarterly: "季度報告",
        yearly: "年報",
      },
      cooldownUnits: {
        minutes: "分鐘",
        hours: "小時",
        days: "天",
      },
      intervalOptions: {
        every30Minutes: "每 30 分鐘",
        everyHour: "每小時",
        every6Hours: "每 6 小時",
        every12Hours: "每 12 小時",
        everyDay: "每天",
        every7Days: "每 7 天",
        every30Days: "每 30 天",
      },
      weekDays: ["週日", "週一", "週二", "週三", "週四", "週五", "週六"],
      metrics: {
        views: "瀏覽量",
        visitors: "訪客",
        sessions: "工作階段",
      },
      windows: {
        last_1h: "最近 1 小時",
        last_24h: "最近 24 小時",
        yesterday: "昨天",
      },
      addSiteFirst: "請先新增站點。",
      deleteDescription: "此操作無法復原。",
      previewStatuses: {
        skipped: "已略過",
        checked: "未觸發",
        triggered: "已觸發",
      },
    },
    publicLinks: {
      copyLink: "複製連結",
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
    scheduledTasks: {
      empty: "暫無排程任務。",
      refresh: "重新整理",
      loadFailed: "載入排程任務失敗。",
      loadMore: "載入更多",
      allStatuses: "全部狀態",
      runs24h: "24 小時內執行次數",
      successRate24h: "24 小時成功率",
      problemRuns24h: "異常執行次數",
      failed: "失敗",
      partial: "部分完成",
      lastRun: "最近執行",
      staleRunning: "長時間未完成的執行",
      taskListTitle: "任務",
      task: "任務",
      schedule: "計劃",
      enabled: "狀態",
      enabledYes: "已啟用",
      enabledNo: "未啟用",
      taskStateSaved: "任務狀態已更新。",
      taskStateSaveFailed: "更新任務狀態失敗。",
      lastStatus: "最近狀態",
      runs30d: "30 天執行",
      successRate30d: "30 天成功率",
      avgDuration: "平均耗時",
      runHistoryTitle: "執行歷史",
      nextRun: "下次執行",
      noRuns: "暫無執行記錄。",
      scheduledAt: "計劃時間",
      startedAt: "開始時間",
      finishedAt: "結束時間",
      trigger: "觸發",
      tasks: "任務",
      taskCount: "任務數",
      subtaskCount: "子任務數",
      taskResult: "任務結果",
      statusLabel: "狀態",
      duration: "耗時",
      sites: "站點",
      hours: "小時",
      rows: "行數",
      rulesScanned: "規則",
      messagesCreated: "訊息",
      emailFailed: "郵件失敗",
      logs: "日誌",
      viewLogs: "檢視日誌",
      logTitle: "執行日誌",
      noRunSelected: "選擇一條執行記錄以檢視日誌。",
      noLogs: "暫無日誌。",
      error: "錯誤",
      status: {
        running: "執行中",
        success: "成功",
        partial: "部分完成",
        failed: "失敗",
        skipped: "已跳過",
      },
      taskDefinitions: {
        visit_hourly_rollup: {
          name: "小時造訪聚合",
          description: "將已結束的造訪彙總為每小時總計，供報表使用。",
          schedule: "每小時",
        },
        notification_tick: {
          name: "通知分發",
          description: "檢查通知規則並分發訊息。",
          schedule: "每 30 分鐘",
        },
        database_maintenance: {
          name: "資料庫最佳化",
          description: "清理過期的任務執行記錄和通知，並最佳化資料庫。",
          schedule: "每天",
        },
      },
      keptForDays: "保留 {days} 天",
    },
  },
  adminUsers: {
    columns: {},
  },
  adminSites: {
    createTitle: "新增站點",
    name: "名稱（選填）",
    domain: "網域",
    create: "新增站點",
    creating: "新增中...",
    createSuccess: "站點已新增。",
    createFailed: "無法新增站點，請重試。",
    invalidDomain: "請輸入網域，例如 example.com。",
    columns: {},
  },
  adminTeams: {
    columns: {},
  },
  requestObservation: {
    blockedTotal: "已封鎖請求",
    retentionNote: "保留 30 天。放行的流量見各站點的儀表板。",
    topReasons: "原因",
    recentTitle: "最近封鎖的請求",
    categoryLabels: {
      custom_block: "封鎖規則",
      bot: "機器人",
      suspected_bot: "託管網路",
    },
    tabs: {},
    refresh: "重新整理",
    loadFailed: "無法載入被攔截的請求。",
    noData: "此期間沒有被攔截的請求。",
    time: "時間",
    site: "站點",
    location: "位置",
    network: "網路",
    reason: "原因",
    userAgent: "User-Agent",
    emptyValue: "未知",
    pathname: "路徑",
    country: "國家/地區",
    ipPrefix: "IP 字首",
    botReasonLabels: {
      missing_ua: "缺少 User-Agent",
      ua_too_long: "User-Agent 過長",
      ua_isbot: "User-Agent 命中機器人特徵",
      script_ua: "指令碼客戶端 User-Agent",
      cf_bot_score_low: "Cloudflare Bot Score 偏低",
      cf_verified_bot_category: "Cloudflare 驗證機器人類別",
      hosting_asn: "託管服務 ASN",
      network_service_asn: "網路服務 ASN",
      transit_asn: "中轉網路 ASN",
      access_asn: "接入網路 ASN",
      missing_browser_provenance: "缺少瀏覽器來源訊號",
      origin_hostname_mismatch: "Origin 與主機名稱不符",
      custom_block: "命中自訂遮蔽規則",
      blocked_domains: "命中網域遮蔽規則",
      blocked_paths: "命中路徑遮蔽規則",
      blocked_query_parameters: "命中查詢參數遮蔽規則",
      blocked_referrers: "命中引薦來源遮蔽規則",
      blocked_user_agents: "命中 User-Agent 遮蔽規則",
      blocked_ips: "命中 IP 遮蔽規則",
      blocked_asns: "命中 ASN 遮蔽規則",
      blocked_countries: "命中國家/地區遮蔽規則",
      blocked_regions: "命中區域遮蔽規則",
    },
    requestKindLabels: {},
    overviewLabels: {
      windowDays: "最近 {days} 天",
    },
    normalDetail: {},
  },
  systemSettings: {
    notificationEmailTitle: "郵件通知",
    emailGatewayNotReady: "此 Every App 閘道尚未設定郵件。",
    emailSenderLabel: "寄件人",
    retentionTitle: "執行資料保留期",
    retentionDescription:
      "設定任務執行記錄、任務日誌、通知訊息和詳細分析資料的保留時間。任務和通知的修改只影響新建記錄；超出新期限的詳細分析資料會在下一次每日執行時刪除。",
    scheduledTaskLogsDaysLabel: "排程任務執行記錄和日誌（天）",
    notificationTestDaysLabel: "測試通知（天）",
    notificationAttentionDaysLabel: "警告和嚴重通知（天）",
    notificationDefaultDaysLabel: "其他通知（天）",
    analyticsDetailDaysLabel:
      "詳細分析資料：頁面瀏覽和事件（天；保留每小時彙總）",
    retentionRangeHint: "請輸入 1 到 3650 之間的整數天數。",
    retentionSave: "儲存保留期設定",
    retentionSaving: "儲存中...",
    retentionSaved: "保留期設定已儲存。",
    retentionSaveFailed: "儲存保留期設定失敗。",
    enabledOn: "開啟",
    enabledOff: "關閉",
    cancel: "取消",
    retentionLowerTitle: "刪除較早的分析資料？",
    retentionLowerDescription:
      "超過 {days} 天的頁面瀏覽和事件會在下一次每日執行時刪除，小時彙總會保留。此操作無法復原。",
    retentionLowerConfirm: "儲存並刪除",
  },
  systemPerformance: {
    refresh: "重新整理",
    loadFailed: "無法載入接收資料。",
    noData: "此期間沒有接收資料。",
    range15m: "最近 15 分鐘",
    range1h: "最近 1 小時",
    range6h: "最近 6 小時",
    range24h: "最近 24 小時",
    totalEvents: "已接收事件",
    p95Latency: "P95 估算延遲",
    p50Latency: "P50",
    p75Latency: "P75",
    p50Label: "P50",
    p75Label: "P75",
    p95Label: "P95",
    dataFreshness: "資料新鮮度",
    noRecentWrite: "暫無最近寫入",
    clockAnomalies: "時鐘/延遲異常",
    delayed: "延遲",
    future: "未來時間戳",
    latencyPercentileTrend: "延遲分位趨勢",
    latencyPercentileTrendDescription:
      "檢視接收事件的 P50、P75、P95 估算延遲。",
    throughputTrend: "已接收事件吞吐",
    throughputTrendDescription: "檢視接收事件的吞吐情況。",
    visits: "造訪",
    customEvents: "自訂事件",
    anomalyBucket: "異常分桶",
    openVisitHealth: "未關閉造訪堆積",
    openVisitHealthDescription: "尚未結束的造訪。",
    open: "未關閉",
    stale: "停滯",
    timedOut: "已超時",
    oldestOpen: "最早未關閉",
    latestActivity: "最近活動",
    latencySampleHealth: "延遲樣本健康度",
    latencySampleHealthDescription: "檢視可信事件的延遲情況。",
    trustedSamples: "可信樣本",
    topSitesTitle: "系統負載最高的站點",
    topSitesDescription: "目前接收事件數量最多的站點。",
    events: "事件",
    avgLatency: "平均延遲",
    slowestEventsTitle: "估算最慢事件",
    slowestEventsDescription: "從發生到儲存延遲最長的事件。",
    eventTime: "事件時間",
    serverTime: "伺服器端寫入時間",
    estimatedDelay: "估算延遲",
    doDiagnosticTitle: "緩衝資料",
    doDiagnosticDescription: "檢查每個站點尚未儲存的資料。",
    doDiagnosticLoadFailed: "無法檢查緩衝資料。",
    doDiagnosticLoading: "正在檢查每個站點…",
    doDiagnosticRun: "檢查緩衝資料",
    doDiagnosticEmpty: "暫無緩衝資料。",
    doDiagnosticUnreachable: "不可達站點",
    doDiagnosticReachableSites: "可達站點",
    doDiagnosticTotalSites: "總站點",
    doDiagnosticActiveAlarms: "活躍 Alarm 定時器",
    doDiagnosticBufferedVisits: "緩衝造訪",
    doDiagnosticOpenVisits: "緩衝未關閉造訪行",
    doDiagnosticOpenStale: "未關閉且停滯 >30 分鐘",
    doDiagnosticOpenTimedOut: "未關閉且停滯 >12 小時",
    doDiagnosticOpenHardAged: "開始時間超過 36 小時",
    doDiagnosticOpenFutureSkew: "未來時間戳",
    doDiagnosticStuckDirty: "未重新整理且卡住",
    doDiagnosticMaxFlushAttempts: "最大重試次數",
    doDiagnosticBufferedCustomEvents: "緩衝自訂事件",
    doDiagnosticOldestOpen: "最早未關閉的造訪",
    doDiagnosticFutureMaxActivity: "最晚的未來活動時間",
    doDiagnosticSiteList: "風險最高的站點",
    doDiagnosticSiteListDescription: "風險最高的 20 個站點。",
    doDiagnosticSiteFailed: "不可達",
    doDiagnosticSiteOpen: "未關閉",
    doDiagnosticSiteStuck: "卡滯",
    doDiagnosticSiteFuture: "未來時間戳",
    doDiagnosticSiteHardAged: "超齡",
    doDiagnosticSiteAlarm: "Alarm 狀態",
    doDiagnosticSiteAlarmNone: "無",
    doDiagnosticSiteAlarmDue: "到期",
    doDiagnosticSiteNextDue: "下一次到期",
    doDiagnosticSiteNextDueFlush: "Flush",
    doDiagnosticSiteNextDueHidden: "隱藏回退",
    doDiagnosticSiteNextDueTimeout: "造訪超時",
    doDiagnosticSiteResponseMs: "響應耗時",
    doDiagnosticHealthy: "目前未發現異常緩衝行。",
  },
  loginForm: {},
  logoutAction: {},
  sidebarFooter: {
    gateway: "返回 Every App",
  },
  appNav: {
    appearance: "外觀",
    mainNavigation: "主導覽",
    toggleSidebar: "切換側邊欄",
    sources: "來源",
    audience: "受眾",
    goals: "目標",
    sites: "站點",
    allSites: "所有站點",
    inbox: "收件匣",
    settings: "設定",
    switchSite: "切換站點",
    siteSettings: "站點設定",
    addSite: "新增站點",
    sections: "分區",
  },
  teamEntry: {},
  getStarted: {
    title: "開始使用",
    progress: "{done} / {total}",
    showSteps: "顯示步驟",
    hideSteps: "隱藏步驟",
    completed: "已完成 {count} 項",
    steps: {
      site: "新增第一個站點",
      tracking: "追蹤你的網站",
      team: "邀請成員",
      notifications: "透過電子郵件接收報告",
      sharing: "分享公開儀表板",
    },
    noSitesTitle: "新增第一個站點",
    memberNoSitesTitle: "還沒有站點",
    memberNoSitesDescription: "請管理員新增一個。",
    addSite: "新增站點",
    waitingTitle: "正在等待第一次頁面瀏覽",
    copy: "複製",
    copied: "已複製",
  },
  settingsNav: {
    label: "設定",
    system: "系統健康",
    account: "帳戶",
    notifications: "通知",
    cancel: "取消",
  },
  systemHealth: {
    tabs: {
      tasks: "排程任務",
      blocked: "已攔截請求",
      ingestion: "資料接收",
      data: "資料",
    },
  },
} as AppMessages;

const jaMessages = {
  appName: "OpenAnalytics",
  uiGallery: {
    categories: {},
  },
  navigation: {
    overview: "概要",
    realtime: "リアルタイム",
    pages: "ページ",
    referrers: "参照元",
    events: "イベント",
    funnels: "目標とファネル",
    campaigns: "キャンペーン",
    visitors: "訪問者",
    retention: "リテンション",
    geo: "地域",
    devices: "デバイス",
    performance: "パフォーマンス",
    settings: "サイト設定",
  },
  common: {
    deviceLabels: {
      desktop: "デスクトップ",
      mobile: "モバイル",
      tablet: "タブレット",
    },
    timeRelativePair: "{absolute}（{relative}）",
    id: "ID",
    views: "表示回数",
    sessions: "セッション",
    visitors: "訪問者",
    bounceRate: "直帰率",
    avgDuration: "平均滞在時間",
    path: "パス",
    title: "タイトル",
    hostname: "ホスト名",
    referrerHost: "参照元ホスト",
    entryPage: "入口ページ",
    exitPage: "離脱ページ",
    referrer: "参照元",
    event: "イベント",
    location: "地域",
    browser: "ブラウザー",
    operatingSystem: "オペレーティングシステム",
    deviceType: "デバイス種別",
    country: "国",
    region: "地域",
    regionCode: "地域コード",
    city: "都市",
    continent: "大陸",
    latitude: "緯度",
    longitude: "経度",
    continentLabels: {
      AF: "アフリカ",
      AN: "南極",
      AS: "アジア",
      EU: "ヨーロッパ",
      NA: "北アメリカ",
      OC: "オセアニア",
      SA: "南アメリカ",
      AFRICA: "アフリカ",
      ANTARCTICA: "南極",
      ASIA: "アジア",
      EUROPE: "ヨーロッパ",
      "NORTH AMERICA": "北アメリカ",
      OCEANIA: "オセアニア",
      "SOUTH AMERICA": "南アメリカ",
    },
    timezone: "タイムゾーン",
    organization: "ネットワーク組織",
    screenSize: "画面サイズ",
    loading: "読み込み中",
    noData: "データなし",
    loadFailed: "読み込めませんでした",
    retry: "再試行",
    filteredEmpty: "このフィルターに一致するデータはありません",
    clearFilters: "フィルターをクリア",
    trend: "推移",
    unknown: "不明",
    site: "サイト",
    system: "システム",
    theme: "テーマ",
    language: "言語",
    search: "検索",
    open: "開く",
    sortBy: "{label}で並べ替え",
    change: "変化",
    new: "新規",
    tableExport: {
      action: "エクスポート",
      title: "CSV をエクスポート",
      description: "テーブルデータを CSV ファイルとしてダウンロードします。",
      scopeLabel: "対象",
      currentTab: "現在のタブ",
      allTabs: "すべてのタブ",
      rowsLabel: "データ",
      currentView: "現在表示中のデータ",
      rawRows: "元データ",
      fileNameLabel: "ファイル名",
      download: "CSV をエクスポート",
      empty: "エクスポートできる行がありません。",
    },
    tableColumns: {
      action: "列設定",
      title: "表の列を設定",
      description: "表示する列を選び、ドラッグして順序を変更します。",
      visible: "表示する列",
      required: "必須",
      reset: "デフォルトに戻す",
      dragHint: "ドラッグして並べ替え",
      close: "閉じる",
    },
    close: "閉じる",
    sitesFiltered: "{active} / {total} サイトを絞り込み中",
    cumulativeTraffic: "期間累計トラフィック",
    cumulativeEvents: "期間累計イベント",
  },
  ranges: {
    today: "今日",
    yesterday: "昨日",
    last7d: "過去 7 日",
    last30d: "過去 30 日",
    last90d: "過去 90 日",
    last12m: "過去 12 か月",
    custom: "カスタム範囲",
  },
  intervals: {
    minute: "分",
    hour: "時間",
    day: "日",
    week: "週",
    month: "月",
  },
  dashboardHeader: {
    interval: "間隔",
    compareButton: "比較",
    compareTitle: "比較設定",
    compareTimeLabel: "比較期間",
    compareCurrentPeriod: "現在の期間",
    comparePreviousPeriod: "前の期間",
    compareFilterLabel: "比較フィルター",
    compareFollowCurrentFilter: "現在のフィルターに従う",
    compareCustomFilter: "カスタムフィルター",
    compareApply: "比較を適用",
    compareCancel: "キャンセル",
    filterButton: "フィルター",
    filterButtonEvent: "フィルター（イベント）",
    filterButtonSession: "フィルター（セッション）",
    filterButtonVisitor: "フィルター（訪問者）",
    customHint: "開始日と終了日を選択してください。",
    customPendingEnd: "開始日が選択されました。終了日を選択してください。",
    customApply: "日付範囲を適用",
    filterTitle: "フィルター",
    previousPeriod: "前の期間",
    nextPeriod: "次の期間",
    customSelectionSummary: "選択範囲：{from} から {to}（{days} 日）",
  },
  filters: {
    clear: "クリア",
  },
  conditionDescription: {
    and: "かつ",
    or: "または",
    not: "（{description}）を満たさない",
    emptyConditions: "条件がありません",
    emptyFilter: "フィルター条件がありません",
    filterEquals: "{field} は {value} と等しい",
    filterNotEquals: "{field} は {value} と等しくない",
    filterAnyOf: "{field} は {values} のいずれかに一致",
    filterNoneOf: "{field} は {values} のいずれにも一致しない",
    filterBetween: "{field} は {from} から {to} の間",
    filterContains: "{field} は {value} を含む",
    filterStartsWith: "{field} は {value} で始まる",
    filterEndsWith: "{field} は {value} で終わる",
    filterGreaterThan: "{field} は {value} より大きい",
    filterGreaterThanOrEqual: "{field} は {value} 以上",
    filterLessThan: "{field} は {value} より小さい",
    filterLessThanOrEqual: "{field} は {value} 以下",
    filterExists: "{field} が存在する",
    filterNotExists: "{field} が存在しない",
    filterIsNull: "{field} は NULL",
    filterNotNull: "{field} は NULL ではない",
    filterIsEmpty: "{field} は空",
    filterNotEmpty: "{field} は空ではない",
  },
  filterBuilder: {
    fieldGroups: {
      advanced: "高度なフィルター",
      page: "ページ",
      session: "セッション",
      visitor: "訪問者",
      referrer: "参照元とチャネル",
      campaign: "キャンペーン",
      client: "クライアント",
      geography: "地域",
      event: "イベント",
      acquisition: "獲得",
      device: "デバイス",
      geo: "地理",
      performance: "パフォーマンス",
      user: "ユーザー",
      time: "時間",
      aggregation: "集計",
      calculation: "計算",
      relation: "行動関係",
    },
    fieldLabels: {
      "page.path": "ページパス",
      "page.title": "ページタイトル",
      "page.collection": "ページ集合",
      "page.hostname": "ページドメイン",
      "page.query": "クエリパラメーター",
      "page.hash": "URL ハッシュ",
      "session.entryPath": "入口ページ",
      "session.exitPath": "出口ページ",
      "referrer.domain": "リファラードメイン",
      "referrer.url": "リファラー URL",
      "traffic.channel": "トラフィックチャネル",
      "utm.source": "UTM ソース",
      "utm.medium": "UTM メディア",
      "utm.campaign": "UTM キャンペーン",
      "utm.term": "UTM キーワード",
      "utm.content": "UTM コンテンツ",
      "client.browser": "ブラウザー",
      "client.browserVersion": "ブラウザーのバージョン",
      "client.browserEngine": "ブラウザーエンジン",
      "client.os": "オペレーティングシステム",
      "client.osVersion": "オペレーティングシステムのバージョン",
      "client.deviceType": "デバイス種別",
      "client.language": "言語",
      "client.screenSize": "画面サイズ",
      "geo.country": "国・地域",
      "geo.region": "都道府県 / 州 / 地域",
      "geo.city": "市区町村",
      "geo.continent": "大陸",
      "geo.timeZone": "タイムゾーン",
      "geo.organization": "ネットワーク組織",
      "event.collection": "イベント集合",
      "event.name": "イベント名",
      "event.payload": "イベント属性",
      "page.durationMs": "ページ滞在時間",
      "session.collection": "セッション集合",
      "session.durationMs": "セッション時間",
      "session.views": "ページ閲覧数",
      "session.events": "イベント数",
      "session.bounce": "直帰したか",
      "visitor.collection": "訪問者集合",
      "visitor.sessions": "セッション数",
      "visitor.views": "ページ閲覧数",
      "visitor.events": "イベント数",
      "performance.ttfbMs": "TTFB",
      "performance.fcpMs": "FCP",
      "performance.lcpMs": "LCP",
      "performance.cls": "CLS",
      "performance.inpMs": "INP",
      "user.id": "ユーザー ID",
      "user.name": "ユーザー名",
      "client.screenWidth": "画面幅",
      "client.screenHeight": "画面の高さ",
      "geo.isEU": "EU 地域か",
      time: "時間",
      "time(...)": "発生時刻",
      $items: "期間内項目",
      $span: "シーケンス幅",
      "$gap(...)": "ステップ間隔",
      "$same(...)": "ステップ共通値",
      "bucket(...)": "時間バケット",
      "window(...)": "相対時間ウィンドウ",
      "periods(...)": "期間グループ",
      "count(...)": "件数",
      "first(...)": "最初",
      "last(...)": "最後",
      "nth(...)": "N 番目",
      "countDistinct(...)": "個別件数",
      "sum(...)": "合計",
      "avg(...)": "平均",
      "min(...)": "最小",
      "max(...)": "最大",
      "add(...)": "加算",
      "sub(...)": "減算",
      "mul(...)": "乗算",
      "div(...)": "除算",
      "sequence(...)": "行動シーケンス",
      "adjacent(...)": "連続行動",
      "without(...)": "中間行動を除外",
    },
    operatorLabels: {
      eq: "等しい",
      neq: "等しくない",
      in: "いずれかに一致",
      notIn: "いずれにも一致しない",
      contains: "含む",
      startsWith: "で始まる",
      endsWith: "で終わる",
      gt: "より大きい",
      gte: "以上",
      lt: "より小さい",
      lte: "以下",
      between: "範囲内",
      exists: "存在する",
      notExists: "存在しない",
      isNull: "NULL である",
      notNull: "NULL ではない",
      isEmpty: "空文字列である",
      notEmpty: "空文字列ではない",
    },
    valueType: "値の種類",
    valueKinds: {
      string: "テキスト",
      enum: "選択肢",
      number: "数値",
      boolean: "真偽値",
      date: "日付",
      datetime: "日時",
      "json-scalar": "JSON スカラー",
    },
    booleanTrue: "真",
    booleanFalse: "偽",
    valueUnset: "（未設定）",
    valueLoading: "値を読み込み中",
    valueSearchPlaceholder: "値を検索または入力",
    valueListPlaceholder: "値を検索または入力して Enter で追加",
    removeValue: "フィルター値「{value}」を削除",
    rangeStartPlaceholder: "下限",
    rangeEndPlaceholder: "上限",
    unitAriaLabel: "表示単位",
    durationUnit: "期間の単位",
    units: {
      hours: "時間",
      minutes: "分",
      seconds: "秒",
      milliseconds: "ミリ秒",
      percent: "%",
      perMille: "‰",
      pixels: "ピクセル",
    },
    jsonPointer: "JSON ポインター",
    jsonPointerPlaceholder: "JSON ポインターを検索または入力",
    match: "一致条件",
    expression: "フィルター式",
    expressionPlaceholder: "フィルター式...",
    naturalLanguageDescription: "自然言語の説明",
    expressionInvalid:
      "式が無効です。クリックして構文ヘルプを確認してください。",
    expressionHelpTitle: "フィルター式の構文",
    expressionHelpDescription: "フィルター式で使えるフィールドと演算子です。",
    expressionHelpSyntax: "構文",
    expressionHelpLogicDescription:
      "AND は OR より優先されます。ネストには括弧を使用し、AND(...) と OR(...) は明示的な単一条件グループを保持します。",
    expressionHelpValues: "値",
    expressionHelpValuesDescription:
      "文字列は JSON の二重引用符を使います。数値と真偽値は引用しません。集合には [値, 値] を使い、between には順序付きの値を 2 つ指定します。",
    expressionHelpOperators: "利用可能な演算子",
    expressionHelpUnaryOperators: "値を取らない演算子",
    expressionHelpFields: "利用可能なフィールド",
    expressionHelpFieldType: "型",
    expressionHelpFieldOperators: "演算子",
    expressionHelpOtherFields: "その他",
    expressionHelpContextTitle: "発生時刻とコンテキスト組み込み値",
    expressionHelpContextDescription:
      "小文字のドット区切り名は登録済みフィールド、大文字の PAGE、EVENT、SESSION、VISITOR はエンティティ集合です。エンティティセレクター内の $.member は現在のエンティティを参照し、-> は集合メンバーを明示的に射影します。@ は時間アンカーで、Sequence と Period の条件には $span、$gap、$items もあります。",
    expressionHelpContextExamples:
      'time(last(PAGE)) gte @now-14d\nsequence([EVENT { $.name eq "signup" }, EVENT { $.name eq "purchase" }]) {\n  $span lte 14d AND $gap(1, 2) lte 7d AND $same($.payload("/productId"))\n} exists',
    advancedEditor: {
      not: "NOT",
      removeNot: "NOT を削除",
      matchAll: "すべて一致",
      matchAny: "いずれかに一致",
      addCondition: "条件を追加",
      addGroup: "グループを追加",
      wrapInNot: "NOT で囲む",
      remove: "削除",
      condition: "条件",
      literalValue: "リテラル値",
      compareWithExpression: "式と比較",
      valuesAsJson: "JSON 形式のフィルター値",
      scalarArrayHelp: "JSON スカラー値の配列を入力してください。",
      chooseValue: "値を選択",
      filterValue: "フィルター値",
      durationAmount: "期間",
      jsonPointer: "ペイロード JSON ポインター",
      jsonPointerPlaceholder: "/property/path",
      entityMember: "エンティティメンバー",
      nthIndex: "N 番目のインデックス",
      fromStep: "開始ステップ",
      toStep: "終了ステップ",
      occurrenceKind: "発生の選択方法",
      occurrenceEntity: "発生の種類",
      occurrenceIndex: "発生番号",
      correlationTarget: "各ステップで共通する値",
      periodItemCount: "期間ごとの項目数",
      nestedTooDeep: "式のネストが深すぎます。",
      applyOffset: "オフセットを適用",
      removeStep: "ステップを削除",
      addStep: "シーケンスステップを追加",
      excludedActivity: "除外するアクティビティ",
      fixedTime: "固定時刻",
      toggleOffsetSign: "時間オフセットの符号を切り替え",
      timeUnits: {
        milliseconds: "ミリ秒",
        seconds: "秒",
        minutes: "分",
        hours: "時間",
        days: "日",
        weeks: "週",
        months: "か月",
        years: "年",
      },
      coreRelation: "高度なフィルター",
      coreRelationExpression: "高度なフィルター式",
      structuredEditor: "高度なフィルター設定",
      unavailableForObservation:
        "Goal と Funnel のステップでは高度なフィルターを使用できません。",
      targetKinds: {
        time: "時刻",
        field: "フィールド",
        "event-payload": "イベントペイロード",
        "entity-root": "エンティティコレクション",
        "context-root": "コンテキスト",
        "context-intrinsic": "コンテキスト組み込み値",
        "occurrence-time": "発生時刻",
        member: "メンバー",
        selector: "セレクター",
        projection: "射影",
        reducer: "リデューサー",
        arithmetic: "算術式",
        duration: "期間",
        "time-anchor": "相対時間",
        "sequence-span": "シーケンス幅",
        "sequence-gap": "ステップ間隔",
        "sequence-same": "シーケンス共通値",
        "period-items": "期間内項目",
        bucket: "時間バケット",
        window: "ウィンドウ",
        periods: "期間コレクション",
        sequence: "シーケンス",
        adjacent: "隣接シーケンス",
        without: "アクティビティを除外するシーケンス",
      },
    },
    savedFiltersLoading: "保存済みフィルターを取得中...",
    noSavedFilter: "保存済みフィルターを使用しない",
    systemPresets: "システムプリセット",
    advanced: "詳細設定",
    systemPresetScopes: {
      preserve: "現在のスコープを維持",
      event: "イベントスコープ",
      session: "セッションスコープ",
      visitor: "訪問者スコープ",
    },
    systemPresetItems: {
      directTraffic: {
        name: "直接トラフィック",
        description: "外部リファラーのない訪問です。",
      },
      organicSearchDiscovery: {
        name: "自然検索による流入",
        description: "キャンペーンタグのない検索エンジン経由の訪問です。",
      },
      campaignTaggedTraffic: {
        name: "キャンペーンタグ付きトラフィック",
        description: "キャンペーンソース、メディア、または名前を持つ訪問です。",
      },
      mobileTraffic: {
        name: "モバイルトラフィック",
        description: "モバイル端末からの訪問です。",
      },
      bouncedSessions: {
        name: "バウンスセッション",
        description: "ページビューが 1 回だけのセッションです。",
      },
      returningVisitors: {
        name: "リピーター訪問者",
        description: "2 セッション以上を持つ訪問者です。",
      },
    },
    savedFiltersPersonal: "個人用フィルター",
    savedFiltersTeam: "組織のフィルター",
    savedFiltersAuthor: "作成者: {name}",
    savedFiltersPrivate: "個人用",
    savedFiltersTeamShared: "組織と共有済み",
    saveThisFilter: "このフィルターを保存",
    saveAsThisFilter: "このフィルターを別名で保存",
    manageThisFilter: "このフィルターを管理",
    finishEditingFilter: "編集を完了",
    createSavedFilter: "フィルターを保存",
    manageSavedFilter: "フィルターを管理",
    savedFilterName: "名前",
    savedFilterDescription: "メモ",
    scopeLabel: "フィルター対象",
    scopeAuto: "現在のページに応じて自動選択",
    scopeEvent: "条件に一致するイベントを絞り込む",
    scopeSession: "これらの条件を満たすセッションを絞り込む",
    scopeVisitor: "これらの条件を満たす訪問者を絞り込む",
    savedFilterVisibility: "公開範囲",
    savedFilterVisibilityPrivate: "自分のみ",
    savedFilterVisibilityTeam: "組織と共有",
    savedFilterCreateDescription:
      "現在のフィルター式を保存して、あとで再び適用できます。",
    savedFilterManageDescription:
      "このフィルターの基本情報を更新するか、条件の編集を開始します。",
    editSavedFilter: "このフィルターを編集",
    deleteSavedFilter: "このフィルターを削除",
    deleteSavedFilterTitle: "このフィルターを削除しますか？",
    deleteSavedFilterDescription:
      "この操作は取り消せません。組織の他のメンバーも使用できなくなります。",
    savedFilterCancel: "キャンセル",
    savedFilterSave: "保存",
    savedFilterSaving: "保存中...",
    savedFilterDelete: "削除",
    savedFilterDeleting: "削除中...",
    savedFilterOperationFailed: "操作に失敗しました。もう一度お試しください。",
    apply: "フィルターを適用",
    allConditions: "すべての条件",
    anyCondition: "いずれかの条件",
    condition: "条件 {index}",
    group: "グループ {index}",
    invertCondition: "この条件を反転",
    exclude: "除外",
    addGroup: "グループを追加",
    invalid: "適用する前に、すべての条件を入力してください。",
  },
  realtime: {
    title: "リアルタイム",
    logTitleSeparator: ":",
    activeNow: "現在アクティブ",
    liveCount: "{count} 人がアクセス中",
    liveMetrics:
      "現在アクティブ / 過去30分の訪問者数 / 過去30分のページビュー数",
    connected: "接続済み",
    connecting: "接続中",
    reconnecting: "再接続中",
    failed: "接続失敗",
    recentEvents: "最近のライブイベント",
    enterPage: "ページに入る",
    leavePage: "ページを離れる",
    viewPage: "ページ表示",
    customEvent: "カスタムイベント",
    detailsTitle: "イベント詳細",
    browsingSection: "閲覧",
    geographySection: "地理位置",
    sourceSection: "参照元",
    statusLabels: {
      active: "アクティブ",
      completed: "完了",
      open: "オープン",
      complete: "完了",
      hidden_pending: "非表示待ち",
    },
    visibilityStateLabels: {
      visible: "表示",
      hidden: "非表示",
    },
    visibilityVisible: "ページが表示可能になりました",
    visibilityHidden: "ページが非表示になりました",
    visibilityChange: "ページの表示状態が変わりました",
    visitorHistorySection: "訪問者アクティビティ",
    visitorHistorySubtitle:
      "現在のリアルタイム範囲における、この訪問者のすべての記録です。",
    visitorHistoryRange: "閲覧期間",
    visitorHistoryEmpty: "この訪問者の追加記録はまだありません。",
    visitorMapUnavailable: "このイベントには利用可能な座標がありません。",
    visitorId: "訪問者 ID",
    sessionId: "セッション ID",
    visitId: "訪問 ID",
    eventTime: "イベント時刻",
    eventKind: "イベント種別",
    eventName: "イベント名",
    traceId: "トレース ID",
    receivedAt: "受信時刻",
    startedAt: "開始時刻",
    previousVisitStartedAt: "前回の訪問開始時刻",
    userId: "ユーザー ID",
    userName: "ユーザー名",
    isEU: "EU の訪問者",
    queryString: "クエリ文字列",
    utmSource: "UTM ソース",
    utmMedium: "UTM メディア",
    utmCampaign: "UTM キャンペーン",
    utmTerm: "UTM キーワード",
    utmContent: "UTM コンテンツ",
    browserVersion: "ブラウザーのバージョン",
    osVersion: "OS バージョン",
    userAgent: "ユーザーエージェント",
    postalCode: "郵便番号",
    metroCode: "都市圏コード",
    status: "ステータス",
    visibilityState: "表示状態",
    endedAt: "終了時刻",
    duration: "継続時間",
    durationSource: "継続時間のソース",
    exitReason: "退出理由",
    leaveAt: "離脱時刻",
  },
  overview: {
    title: "概要",
    trendTitle: "トラフィック推移",
    sourceTab: "ソース",
    sourceDomainColumn: "ソース（ドメイン）",
    sourceLinkTab: "ソースリンク",
    sourceLinkColumn: "ソースリンク",
    channelTab: "チャネル",
    channelColumn: "チャネル",
    direct: "直接",
    channelLabels: {
      direct: "直接",
      organic_search: "オーガニック検索",
      social: "ソーシャル",
      paid_search: "有料検索",
      paid_social: "有料ソーシャル",
      display: "ディスプレイ広告",
      email: "メール",
      affiliate: "アフィリエイト",
      referral: "外部参照",
      campaign: "キャンペーン",
      other: "その他",
    },
    searchInTab: "{tab} を検索",
  },
  install: {
    title: "サイトにスクリプトを追加",
    platforms: {
      html: "HTML",
      wordpress: "WordPress",
      shopify: "Shopify",
      nextjs: "Next.js",
      gtm: "Google タグ マネージャー",
    },
    steps: {
      html: "すべてのページの {tag} の直前に貼り付けます。",
      wordpress:
        "WPCode などのヘッダースクリプト用プラグインで追加するか、テーマの header.php の {tag} の直前に貼り付けます。",
      shopify:
        "「オンラインストア → テーマ → コードを編集」で theme.liquid を開き、{tag} の直前に貼り付けます。",
      nextjs: "app/layout.tsx の {tag} 内に貼り付けます。",
      gtm: "このスクリプトでカスタム HTML タグを作成し、トリガーを「All Pages」にして公開します。",
    },
    waiting: "最初のページビューを待っています",
    received:
      "最初のページビューを受け取りました。レポートは 1 分以内に表示されます。",
    firstViewsTitle: "最初のページビューが届きました！",
    nextReports: "メールでレポートを受け取る",
    nextInvite: "メンバーを招待",
    dismiss: "閉じる",
  },
  pages: {
    title: "ページ",
    pagesPerSession: "ページ / セッション",
    changePercentColumnLabel: "{metric}の変化（%）",
    changePointsColumnLabel: "{metric}の変化（ポイント）",
    percentagePointSuffix: "ポイント",
    untitled: "無題のページ",
    empty: "ページはまだありません",
    loadMoreError: "追加のページを読み込めませんでした。",
    trendTitle: "ページトラフィック推移",
    otherPages: "その他のページ",
    hashTab: "アンカー",
    noHash: "アンカーなし",
    queryTab: "クエリパラメータ",
    noQuery: "クエリパラメータなし",
    eventTab: "イベント",
    eventsMetric: "イベント数",
    viewDetails: "詳細を表示",
  },
  referrers: {
    title: "参照元",
    splitTitle: "トラフィック内訳",
    breakdownTitle: "ソース内訳",
    externalLabel: "外部",
    longTail: "ロングテール",
    channelLongTail: "その他のチャネル",
  },
  campaigns: {
    title: "キャンペーン",
    tabSource: "UTM ソース",
    tabMedium: "メディア",
    tabCampaign: "キャンペーン",
    tabTerm: "キーワード",
    tabContent: "コンテンツ",
    notSet: "未設定",
    noTaggedTraffic: "この期間に UTM タグ付きの訪問はありません",
    taggedLinkHint: "リンクに UTM タグを付けます。例：",
  },
  sessions: {
    title: "セッション",
    search: "セッションを検索...",
    started: "開始時刻",
    sessionId: "セッション ID",
    visitor: "訪問者",
    anonymous: "匿名",
    entryPage: "入口ページ",
    exitPage: "離脱ページ",
    duration: "滞在時間",
    referrer: "参照元",
    location: "地域",
    os: "OS",
    browser: "ブラウザー",
    device: "デバイス",
    pageViews: "ページビュー数",
    customEvents: "カスタムイベント",
    screenSize: "画面サイズ",
    exitTime: "離脱時刻",
    loadError: "セッションを読み込めません。",
    empty: "この時間範囲にセッションはありません。",
  },
  sessionDetail: {
    anonymous: "匿名",
    userId: "ユーザー ID",
    userName: "ユーザー名",
    back: "セッションへ戻る",
    missing: "sessionId がありません。",
    notFound: "セッションが見つかりません。",
    loadError: "セッション詳細を読み込めません。",
    active: "アクティブ",
    inactive: "終了",
    status: "ステータス",
    duration: "滞在時間",
    screenViews: "ページビュー数",
    events: "イベント",
    bounce: "直帰したか",
    entryPath: "入口パス",
    exitPath: "離脱パス",
    referrerName: "参照元名",
    os: "OS",
    browser: "ブラウザー",
    device: "デバイス",
    screen: "画面",
    yes: "はい",
    no: "いいえ",
    uniquePages: "ユニークページ数",
    firstEvent: "最初のイベント",
    lastEvent: "最後のイベント",
    sessionStarted: "セッション開始",
    pageview: "ページビュー",
    exitPage: "離脱ページ",
    customEvent: "カスタムイベント",
    eventTitleSeparator: ": ",
    visitDetailsTitle: "訪問詳細",
    visitDetailsSubtitle:
      "セッション開始、ページビュー、離脱、カスタムイベントを発生順に表示します。",
    location: "地域",
    visitorId: "訪問者 ID",
    sessionId: "セッション ID",
    referrerUrl: "参照元 URL",
    emptyEvents: "記録されたイベントはありません。",
    emptyCustomEvents: "カスタムイベントはありません。",
    sincePrevious: "前回から",
    geoLocationTitle: "地理的位置",
    performanceTitle: "現在のセッションパフォーマンス",
    range: "範囲",
  },
  events: {
    title: "イベント",
    detailTitle: "イベント詳細",
    backToEvents: "イベントへ戻る",
    totalEvents: "総イベント数",
    eventTypes: "イベント種別",
    sessions: "トリガーセッション数",
    visitors: "トリガー訪問者数",
    avgEventsPerSession: "平均イベント / セッション",
    shareOfAllEvents: "全イベント内シェア",
    triggerCount: "トリガー数",
    triggerVisitors: "トリガー訪問者数",
    trendTitle: "イベント推移",
    topEvents: "上位イベント",
    recordsTitle: "イベント記録",
    fieldsTitle: "ペイロードフィールド",
    fieldsSubtitle: "値とメタデータを確認する項目を選択します。",
    fieldValuesTitle: "項目値",
    fieldValuesSubtitle:
      "選択した項目の記録と出現回数です。行をクリックするとフィルターできます。",
    fieldValuesEmpty: "この項目には値が記録されていません。",
    payloadFilter: "フィルター",
    payloadFilterTitle: "ペイロードフィルター",
    payloadFilterSubtitle:
      "1 行に 1 条件を追加します。== または != で条件を組み合わせます。",
    payloadFilterPlaceholder: 'path.value == "a"\nlevel != 0',
    payloadFilterApply: "フィルターを適用",
    payloadFilterClear: "フィルターをクリア",
    payloadFilterInvalid:
      "フィルター条件を解析できません。フィールドパス、演算子、値を確認してください。",
    expandField: "項目を展開",
    collapseField: "項目を折りたたむ",
    search: "イベント名、ID、訪問者、セッション、ページを検索...",
    eventName: "イベント名",
    eventId: "イベント ID",
    occurredAt: "発生",
    receivedAt: "受信",
    page: "ページ",
    context: "コンテキスト",
    visitor: "訪問者",
    visit: "訪問",
    referrer: "参照元",
    location: "地域",
    browser: "ブラウザー",
    os: "OS",
    device: "デバイス",
    payload: "ペイロード",
    nodeCount: "ノード数",
    payloadFields: "ペイロードフィールド",
    values: "値",
    nodes: "ノード",
    occurrences: "出現回数",
    openVisitor: "訪問者を開く",
    openSession: "セッションを開く",
    integratingEvent: "イベントを統合中 ({seconds}s)",
    copyJson: "JSON をコピー",
    copiedJson: "JSON をコピーしました。",
    copyJsonFailed: "JSON をコピーできません。",
    copyValue: "値をコピー",
    copiedValue: "値をコピーしました。",
    copyValueFailed: "値のコピーに失敗しました。",
    loadError: "イベントデータを読み込めません。",
    detailNotFound: "このイベント記録が見つかりません。",
    empty: "この範囲にカスタムイベントはありません。",
    noCustomEvents: "この期間のカスタムイベントはありません",
    emptyFields: "このイベントにペイロードフィールドはありません。",
    noEventName: "イベント名がありません。",
    loading: "読み込み中",
    other: "その他",
  },
  funnels: {
    title: "ファネル",
    listTitle: "ファネル定義",
    conversionRecords: "コンバージョン記録",
    converted: "コンバージョン済み",
    dropped: "離脱",
    open: "ファネルを開く",
    moreActions: "その他の操作",
    createTitle: "ファネルを作成",
    nameLabel: "名前",
    namePlaceholder: "登録アクティベーション",
    stepsLabel: "ステップ",
    addStep: "ステップを追加",
    removeStep: "削除",
    progression: "集計単位",
    conversionWindow: "コンバージョン期間",
    custom: "カスタム",
    customWindowHours: "カスタム期間（時間）",
    stepFilter: "ステップフィルター",
    filter: "フィルター",
    apply: "適用",
    condition: "条件",
    conditions: "条件",
    expression: "フィルター式",
    filterPlaceholder: '例 page.path eq "/pricing"',
    invalidFilter: "無効なフィルター",
    dragStep: "ステップをドラッグ",
    unnamed: "（名前なし）",
    oneHour: "1 時間",
    oneDay: "24 時間",
    sevenDays: "7 日",
    thirtyDays: "30 日",
    save: "作成",
    saveEdit: "変更を保存",
    edit: "編集",
    editTitle: "ファネルを編集",
    creating: "作成中...",
    cancel: "キャンセル",
    delete: "削除",
    deleteTitle: "ファネルを削除",
    deleteDescription:
      "保存済みのファネル定義を削除します。過去の分析データは削除されません。",
    deleteConfirm: "ファネルを削除",
    deleting: "削除中...",
    detailLoadError: "ファネル分析を読み込めません。",
    invalidFunnel:
      "名前と、完全なフィルターステップを少なくとも 2 つ追加してください。",
    created: "ファネルを作成しました。",
    createFailed: "ファネルを作成できません。",
    updatedSuccess: "ファネルを更新しました。",
    saveFailed: "ファネルを保存できません。",
    deleted: "ファネルを削除しました。",
    deleteFailed: "ファネルを削除できません。",
    overallConversion: "全体コンバージョン",
    startedSessions: "開始セッション数",
    startedVisitors: "開始訪問者数",
    convertedSessions: "コンバージョンセッション数",
    convertedVisitors: "コンバージョン訪問者数",
    largestDropOff: "最大離脱",
    noDropOff: "離脱なし",
    step: "ステップ",
    sessions: "セッション",
    visitors: "訪問者",
    conversion: "コンバージョン",
    stepConversion: "ステップコンバージョン率",
    dropOff: "離脱",
    updated: "更新",
  },
  goals: {
    title: "目標",
    conversionRecords: "コンバージョン記録",
    open: "目標を開く",
    moreActions: "その他の操作",
    createTitle: "目標を作成",
    nameLabel: "名前",
    namePlaceholder: "購入完了",
    filter: "コンバージョン条件",
    apply: "適用",
    cancel: "キャンセル",
    save: "作成",
    saveEdit: "変更を保存",
    edit: "編集",
    editTitle: "目標を編集",
    creating: "作成中...",
    delete: "削除",
    deleteTitle: "目標を削除",
    deleteDescription:
      "保存した目標定義を削除します。過去の分析データは削除されません。",
    deleteConfirm: "目標を削除",
    detailLoadError: "目標分析を読み込めません。",
    invalidGoal: "名前と完全なコンバージョン条件を入力してください。",
    created: "目標を作成しました。",
    updatedSuccess: "目標を更新しました。",
    saveFailed: "目標を保存できません。",
    deleted: "目標を削除しました。",
    deleteFailed: "目標を削除できません。",
    sessions: "セッション",
    visitors: "訪問者",
    total: "合計",
    converted: "コンバージョン",
    conversion: "転換率",
    timeseries: "コンバージョン率",
    updated: "更新",
  },
  conversions: {
    new: "新規作成",
    newGoal: "目標",
    newGoalDescription: "登録などの 1 ステップ",
    newFunnel: "ファネル",
    newFunnelDescription: "順番に進む複数のステップ",
    empty: "目標とファネルはまだありません",
    emptyMemberHint: "管理者が作成できます。",
  },
  visitors: {
    title: "訪問者",
    search: "訪問者を検索...",
    visitor: "訪問者",
    anonymous: "匿名",
    referrer: "参照元",
    location: "地域",
    os: "OS",
    browser: "ブラウザー",
    device: "デバイス",
    firstSeen: "初回訪問",
    lastSeen: "最終訪問",
    pageViews: "ページビュー数",
    sessions: "セッション数",
    customEvents: "カスタムイベント",
    screenSize: "画面サイズ",
    loadError: "訪問者を読み込めません。",
    empty: "この時間範囲に訪問者はいません。",
  },
  visitorDetail: {
    anonymous: "匿名",
    userId: "ユーザー ID",
    userName: "ユーザー名",
    back: "訪問者へ戻る",
    missing: "visitorId がありません。",
    notFound: "訪問者が見つかりません。",
    loadError: "訪問者詳細を読み込めません。",
    totalDuration: "合計滞在時間",
    events: "イベント",
    views: "ページビュー数",
    uniquePages: "ユニークページ数",
    avgPagesPerSession: "平均ページ / セッション",
    avgEventsPerSession: "平均イベント / セッション",
    avgStay: "平均滞在時間",
    firstSeen: "初回訪問",
    lastSeen: "最終訪問",
    daysActive: "アクティブ日数",
    avgTimeBetweenSessions: "セッション間の平均時間",
    activity: "アクティビティ",
    sessionRecords: "セッション記録",
    started: "開始時刻",
    visitor: "訪問者",
    duration: "滞在時間",
    referrer: "参照元",
    pageViews: "ページビュー数",
    visitDetailsTitle: "訪問詳細",
    visitDetailsSubtitle:
      "この訪問者のセッション開始、ページビュー、離脱、カスタムイベントを発生順に表示します。",
    customEvents: "カスタムイベント",
    emptyEvents: "記録されたイベントはありません。",
    emptyCustomEvents: "カスタムイベントはありません。",
    emptySessions: "記録されたセッションはありません。",
    visitorId: "訪問者 ID",
    sessionId: "セッション ID",
    referrerName: "参照元名",
    referrerUrl: "参照元 URL",
    location: "地域",
    browser: "ブラウザー",
    os: "OS",
    device: "デバイス",
    screen: "画面",
    entryPath: "入口パス",
    exitPath: "離脱パス",
    sessionStarted: "セッション開始",
    pageview: "ページビュー",
    exitPage: "離脱ページ",
    customEvent: "カスタムイベント",
    eventTitleSeparator: ": ",
    sincePrevious: "前回から",
    geoLocationTitle: "地理的位置",
    performanceTitle: "現在の訪問者パフォーマンス",
    range: "範囲",
  },
  retention: {
    title: "リテンション",
    cohortBy: "コホート単位：{interval}",
    cohortDate: "コホート日付",
    cohortSize: "コホート人数",
    periodLabel: "期間 {n}",
    matrixTitle: "リテンションマトリクス",
    matrixSubtitle:
      "各行は初回確認コホート、各列は後続期間に戻ってきた割合を示します。",
    cohortsMetric: "コホート数",
    visitorsMetric: "コホート訪問者数",
    periodOneMetric: "初回再訪",
    averageReturnMetric: "平均再訪",
    strongestCohortMetric: "最良コホート",
    eligibleVisitors: "対象訪問者数",
    periodsAnalyzed: "分析対象期間",
    noEligibleCohorts: "対象コホートがありません",
    overallRetention: "全体リテンション",
    legendLow: "低",
    legendHigh: "高",
    periodZero: "初回",
    empty: "この時間範囲には十分な再訪データがありません。",
    emptyHint: "日付メニューでより長い期間か、より粗い間隔を選んでください。",
    loadError: "リテンションデータを読み込めません。",
    unavailableCell: "このコホートはまだこの期間に到達していません。",
    visitorsDetail: "訪問者",
    rateDetail: "リテンション",
    sizeDetail: "コホート人数",
  },
  geo: {
    title: "地域",
    mapTitle: "地域別の訪問者",
    countryLabel: "国 / 地域",
    regionLabel: "地域",
    cityLabel: "都市",
    back: "戻る",
    viewOnWikipedia: "Wikipedia で見る",
    investigationNotice:
      "このデータは Web 由来のため、誤りを含む場合があります。",
    timezoneDeltaVsLocal: "現地時刻との差：{delta}",
    visitorCoordinates: "訪問者座標",
    ipNotice:
      "IP から推定した地域です。座標は概算であり、正確な住所を示すものではありません。",
    multipleNotice:
      "この訪問者は、異なるセッションで複数の都市を訪れる場合があります。",
    investigation: {
      countryScopedLabel: "所属国の{label}",
      capital: "首都",
      population: "人口",
      gdp: "GDP",
      gdpPerCapita: "1 人あたり GDP",
      marketPenetration: "市場浸透率",
      region: "地域",
      currency: "通貨",
      phonecode: "国番号",
      timezone: "タイムゾーン",
      type: "種別",
      iso: "ISO",
      coordinates: "座標",
      unavailable: "N/A",
      gdpValue: "{value} 百万 USD",
      gdpPerCapitaValue: "{value} USD/人",
      gdpPerCapitaNearAverage: "{value} USD/人（世界平均付近）",
      gdpPerCapitaAboveAverage: "{value} USD/人（平均より {percent}% 高い）",
      gdpPerCapitaBelowAverage: "{value} USD/人（平均より {percent}% 低い）",
      marketPenetrationWindow: "{label}（{days} 日）",
      timezoneCount: "{count} タイムゾーン",
      typeLabels: {
        country: "国",
        state: "州",
        province: "省",
        prefecture: "都道府県",
        city: "市",
        county: "郡",
        district: "区",
        town: "町",
        village: "村",
        municipality: "自治体",
        territory: "領土",
        section: "区域",
        adm1: "行政レベル 1",
        adm2: "行政レベル 2",
        adm3: "行政レベル 3",
        adm4: "行政レベル 4",
        adm5: "行政レベル 5",
      },
    },
  },
  devices: {
    title: "デバイス",
    shareTitle: "訪問者の割合",
    dimensions: {
      device: "デバイス",
      os: "OS",
      browser: "ブラウザー",
      engine: "エンジン",
      screenSize: "画面サイズ",
    },
    crossTabTitle: "クロス集計",
    crossTabRows: "行",
    crossTabColumns: "内訳",
    otherLabel: "その他",
    screenBucketLabels: {},
  },
  browsers: {
    otherLabel: "その他",
  },
  performance: {
    title: "パフォーマンス",
    empty: "Web Vitals はまだありません",
    chartTitle: "パフォーマンス推移",
    avgLabel: "平均",
    samplesLabel: "サンプル",
    p50Label: "P50",
    p75Label: "P75",
    p95Label: "P95",
    ttfb: "初回バイト到達時間",
    fcp: "初回コンテンツ描画",
    lcp: "最大コンテンツ描画",
    cls: "累積レイアウトシフト",
    inp: "次の描画までの操作応答時間",
    ttfbDescription:
      "ブラウザーがサーバーから最初のバイトを受け取るまでの待機時間を測定します。バックエンド遅延、ネットワーク遅延、キャッシュ効率を反映します。",
    fcpDescription:
      "最初のテキストまたは画像が描画された時点を測定します。訪問者がページの読み込み開始をどれだけ早く認識できるかを示します。",
    lcpDescription:
      "表示領域内で最大のコンテンツ要素が描画完了した時点を測定します。体感上の読み込み完了を示す主要な速度指標です。",
    clsDescription:
      "ページライフサイクル中に発生する予期しないレイアウト移動を測定します。値が低いほど表示が安定しています。",
    inpDescription:
      "ユーザー操作から次の描画までの遅延を測定します。読み込み後の操作応答性を反映します。",
    msUnit: "ms",
    secondsUnit: "秒",
    clsUnit: "スコア",
    score: "体験スコア",
    scoreDescription:
      "P75 の読み込み、安定性、操作指標を 0 から 100 の体験スコアに統合します。高いほど良好です。",
    great: "良好",
    needsImprovement: "改善が必要",
    poor: "不良",
    datasetTitle: "しきい値",
    interpretationTitle: "現在の読み取り",
    currentReading:
      "{metric} の P75 は {value}、{samples} 件のサンプルに基づく体験スコアは {score} です。現在の判定：{status}。",
    metricThresholdText:
      "良好：{good} 以下、要改善：{good} から {poor}、不良：{poor} 超。",
    scoreThresholdText: "良好：90 超、要改善：50 から 90、不良：50 未満。",
    countryHealthTitle: "国・地域の状態",
    countryHealthSubtitle:
      "国または地域ごとの {metric} の状態を境界色で示します。",
    pathsTitle: "パスパフォーマンス",
    pathsAnalyzedLabel: "分析対象パス",
    metricValueColumn: "P75 値",
    statusColumn: "状態",
  },
  share: {
    noData: "データはまだありません",
  },
  siteSettings: {
    title: "サイト設定",
    sections: {
      basic: {
        title: "一般",
      },
      tracking: {
        title: "トラッキング",
      },
      blocking: {
        title: "ブロックルール",
      },
      protection: {
        title: "保護",
      },
      danger: {
        title: "危険な操作",
      },
      install: {
        title: "インストール",
      },
      advanced: {
        title: "詳細設定",
      },
    },
    nameLabel: "名前",
    domainLabel: "ドメイン",
    publicSharingTitle: "共有",
    publicEnabledLabel: "公開ダッシュボード",
    publicSlugLabel: "リンクのパス",
    publicSlugPlaceholder: "例: my-site",
    publicSlugHint: "リンクの /share/ 以降の部分です。",
    publicLinkLabel: "公開リンク",
    copiedLink: "リンクをコピーしました",
    trackingStrengthGroupTitle: "トラッキング強度",
    trackingStrengthStrong: "強",
    trackingStrengthSmart: "スマート",
    trackingStrengthWeak: "弱",
    trackingStrengthStrongDescription:
      "常に高精度の訪問者トラッキングを使用します。GDPR など、一部地域のプライバシー規制に抵触する可能性があります。",
    trackingStrengthSmartDescription:
      "訪問者の国に基づいてトラッキング強度を自動で切り替えます。",
    trackingStrengthWeakDescription:
      "常にトラッキング精度を下げます。同じ訪問者が複数回カウントされ、リテンション分析ができなくなる場合があります。",
    botProtectionEnabledLabel: "検出したボットをブロック",
    botProtectionEnabledHint:
      "有効にすると高信頼度のボットリクエストをブロックし、無効にすると統計に含めます。",
    hostingProxyBlockingEnabledLabel:
      "ホスティング・プロキシネットワークをブロック",
    hostingProxyBlockingEnabledHint:
      "ホスティングまたはプロキシネットワークからの疑わしいボットリクエストをブロックします。",
    trackQueryParamsLabel: "クエリパラメーターを記録",
    trackHashLabel: "URL ハッシュを記録",
    blockingRulesSave: "ルールを保存",
    blockingRulesDialogs: {
      searchButton: "検索",
      searchTitle: "地域を検索",
      searchDescription: "名前またはコードで検索し、結果を選んでください。",
      searchInputLabel: "検索",
      searchInputPlaceholder: "名前またはコードで検索",
      searchCountryLabel: "国 / 地域",
      searchRegionLabel: "州 / 省",
      searchBack: "国 / 地域を変更",
      searchLoading: "地域を読み込み中...",
      searchNoResults: "一致する地域がありません。",
      searchLoadError:
        "地域を読み込めません。しばらくしてから再試行してください。",
      searchClose: "閉じる",
    },
    blockingRulesFields: {
      domains: {
        title: "ドメイン",
        placeholder: "admin.example.com",
      },
      paths: {
        title: "パス",
        placeholder: "/admin/*",
      },
      queryParameters: {
        title: "クエリパラメーター",
        placeholder: "utm_source=spam",
      },
      referrers: {
        title: "リファラー",
        placeholder: "*.spam.example",
      },
      userAgents: {
        title: "User-Agent",
        placeholder: "*bot*",
      },
      ips: {
        title: "IP アドレス",
        placeholder: "203.0.113.0/24",
      },
      asns: {
        title: "ASN",
        placeholder: "64500",
      },
      countries: {
        title: "国・地域",
        placeholder: "DE",
      },
      regions: {
        title: "州・省",
        placeholder: "US-CA",
      },
    },
    ignoreDoNotTrackLabel: "Do Not Track を無視",
    autoTrackOutboundLinksLabel: "外部リンククリックを自動追跡",
    autoTrackOutboundLinksHint:
      "有効にすると、外部ドメインへのリンククリックで outbound_click イベントを自動送信します。",
    performanceSampleRateLabel: "Web Vitals のサンプリング率",
    performanceSampleRateHint:
      "サンプリングされた訪問では、離脱時に TTFB、FCP、LCP、CLS、INP を記録します。0 で無効、100 で全量収集です。",
    save: "保存",
    saving: "保存中...",
    scriptHint: "各ページの </head> の直前に貼り付けてください。",
    copyScript: "スクリプトをコピー",
    copiedScript: "スクリプトをコピーしました。",
    scriptUnavailable: "現在スクリプトを利用できません。",
    deleteTitle: "サイトを削除",
    deleteSubtitle: "サイトとそのすべての分析データを削除します。",
    delete: "サイトを削除",
    deleting: "削除中...",
    deleteConfirm: "この操作は元に戻せません。続行しますか？",
    toasts: {
      saved: "サイト設定を保存しました。",
      saveFailed: "サイト設定を保存できません。",
      scriptLoadFailed: "スクリプトスニペットを読み込めません。",
      settingsLoadFailed: "スクリプト設定を読み込めません。",
      settingsPropagationHint: "変更の反映には最大 1 時間かかります。",
      deleted: "サイトを削除しました。",
      deleteFailed: "サイトを削除できません。",
      invalidInput: "有効なサイト名とドメインを入力してください。",
    },
    publicEnabledHint:
      "リンクを知っている人は誰でもこのサイトのレポートを閲覧できます。",
    viewBlockedRequests: "ブロックされたリクエストを見る",
    blockingRulesHelp:
      "「ブロック」ルールに一致したリクエストは集計されません。「許可」は例外を作ります。同じ種類の複数のルールに一致した場合は、最後のルールが優先されます。* はワイルドカードとして使えます。",
    blockingRuleTypeLabel: "種類",
    blockingRuleActionLabel: "動作",
    blockingRuleValueLabel: "値",
    blockingRuleBlock: "ブロック",
    blockingRuleAllow: "許可",
    blockingRuleAdd: "ルールを追加",
    blockingRuleRemove: "ルールを削除",
    blockingRulesEmpty: "ブロックルールはありません。",
    blockingRuleInvalid: "この種類に有効な値を入力してください。",
    blockingRulesTooMany: "{type} のルールが多すぎます。",
  },
  accountSettings: {
    emailManagedByGateway:
      "メールアドレスは Every App のアカウントのものです。",
    profileTitle: "個人情報",
    nicknameLabel: "表示名",
    nicknamePlaceholder: "例: プロダクトアナリスト",
    emailLabel: "メール",
    profileSaved: "個人情報を保存しました。",
    profileSaveFailed: "個人情報を保存できません。",
    timeZoneTitle: "タイムゾーン",
    browserUnavailable: "検出されません",
    useBrowser: "ブラウザーのタイムゾーン（{zone}）",
    saved: "タイムゾーンを保存しました。",
    saveFailed: "タイムゾーンを保存できません。",
    timeZoneLabel: "レポートのタイムゾーン",
    languageSaveFailed: "言語を保存できません。",
  },
  notificationCenter: {
    title: "受信トレイ",
    empty: "通知はまだありません。",
    loading: "通知を読み込み中",
    markRead: "既読にする",
    markAllRead: "すべて既読にする",
    loadFailed: "通知を読み込めません。",
    markReadFailed: "通知を既読にできません。",
    markAllReadSuccess: "通知を既読にしました。",
    markAllReadFailed: "すべての通知を既読にできません。",
    tabs: {
      all: "すべて",
      unread: "未読",
    },
    severities: {
      info: "情報",
      success: "成功",
      warning: "警告",
      critical: "重大",
    },
    preferencesTitle: "通知設定",
    emailNotificationsLabel: "メール通知",
    reportsUnreadLabel: "新しいレポートを未読にする",
    milestonesUnreadLabel: "新しいマイルストーンを未読にする",
    alertsUnreadLabel: "新しいアラートを未読にする",
    preferencesSaveFailed: "通知設定を保存できません。",
    detailFields: {},
    noUnread: "未読の通知はありません。",
    emailFailed: "メール送信失敗",
  },
  notificationEmail: {
    common: {
      brand: "OpenAnalytics",
      date: "日付",
      coreMetrics: "主要指標",
      topPages: "上位ページ",
      topReferrers: "上位参照元",
      views: "表示回数",
      visitors: "訪問者数",
      sessions: "セッション数",
      visits: "回の訪問",
      viewsUnit: "回の表示",
      direct: "直接アクセス",
      metric: "指標",
      window: "期間",
      currentValue: "現在値",
      previousValue: "前回値",
      threshold: "しきい値",
      milestone: "マイルストーン",
      change: "変化",
      mode: "モード",
      lastSeen: "最終受信",
      never: "未受信",
      noPageData: "ページデータはありません。",
      noReferrerData: "参照元データはありません。",
      footer: "このメールは OpenAnalytics の通知システムから送信されました。",
      fallbackSubject: "OpenAnalytics 通知",
      trackingHint:
        "トラッキングスクリプトが正しく設置されているか、またはサイトに引き続きトラフィックがあるかを確認してください。",
      severity: {
        info: "情報",
        success: "成功",
        warning: "警告",
        critical: "重大",
      },
    },
    test: {
      subject: "OpenAnalytics 通知テスト",
      title: "OpenAnalytics 通知テスト",
      summary: "これは OpenAnalytics からのテスト通知です。",
      body: "これは OpenAnalytics からのテスト通知です。メールが設定され有効になっている場合、このメッセージは Resend の配信も確認します。",
    },
    report: {
      subject: "{site} の{periodLabel}トラフィックレポート",
      title: "{site} の{periodLabel}トラフィックレポート",
      summary: "{date}：訪問者 {visitors}、表示回数 {views}。",
      periodLabels: {
        daily: "日次",
        weekly: "週次",
        monthly: "月次",
        quarterly: "四半期",
        yearly: "年次",
      },
    },
    milestone: {
      subject: "{site} が {bucket} {metric} に到達しました",
      title: "{site} が {bucket} {metric} に到達しました",
      summary:
        "トラフィックのマイルストーンに到達しました：{bucket} {metric}。",
    },
    threshold: {
      subject: "{site} のトラフィックがしきい値に達しました",
      title: "{site} のトラフィックがしきい値に達しました",
      summary:
        "{window}の{metric}は {value} で、しきい値 {operator} {target} に一致しています。",
      metricLabels: {
        views: "表示回数",
        visitors: "訪問者数",
        sessions: "セッション数",
      },
      windows: {
        last_1h: "過去 1 時間",
        last_24h: "過去 24 時間",
        yesterday: "昨日",
      },
    },
    health: {
      subject: "{site} は {hours} 時間データを受信していません",
      title: "{site} は {hours} 時間データを受信していません",
      noHistory:
        "過去のトラフィックデータが見つかりません。トラッキングスクリプトが設置されているか確認してください。",
    },
    change: {
      subject: "{site} のトラフィック変化を検出しました",
      title: "{site} のトラフィック変化を検出しました",
      summary: "{window}の{metric}が {change} 変化しました。",
    },
  },
  runtimeConfigError: {
    title: "ダッシュボードを利用できません",
    heading: "このダッシュボードは現在利用できません。",
    setupSummary: "このデプロイを設定する",
    setupCommand:
      "このコマンドでルートシークレットを設定してから、このページを再読み込みしてください。",
    docsLabel: "デプロイガイド",
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
    notFoundTitle: "お探しのページが見つかりません",
    notFoundDescription:
      "アドレスが正しくないか、ページが移動した可能性があります。",
    errorTitle: "問題が発生しました",
    errorDescription: "OpenAnalytics はリクエストを完了できませんでした。",
    homeAction: "ホームに戻る",
    reportAction: "GitHub で報告",
  },
  actions: {
    switchToEnglish: "English",
    switchToChinese: "簡体字中国語",
    switchToTraditionalChinese: "繁体字中国語",
    switchToJapanese: "日本語",
    switchToLight: "ライト",
    switchToDark: "ダーク",
  },
  teamSelect: {
    groups: {},
    cancel: "キャンセル",
  },
  teamManagement: {
    stats: {},
    toasts: {},
    sites: {
      aggregateTitle: "総訪問数",
      openAnalytics: "アナリティクスを開く",
      title: "すべてのサイト",
      pagesPerSession: "ページ / セッション",
      public: "公開",
      openPublic: "公開ダッシュボードを開く",
    },
    widgets: {},
    notifications: {
      empty: "通知ルールはまだありません。",
      rulesTitle: "通知ルール",
      enabledCount: "この組織で {count} 件のルールが有効です。",
      loadingRules: "通知ルールを読み込み中",
      deliveryTestTitle: "配信テスト",
      deliveryTestDescription:
        "あなた宛てのアプリ内通知を 1 件作成し、利用可能な場合はメール送信も試行します。",
      inAppTestHint: "アプリ内通知を送信します。",
      emailTestConfiguredHint: "テストメールを送信します。",
      emailTestUnconfiguredHint:
        "この Every App ゲートウェイではメールが設定されていません。",
      sendTestNotification: "テスト通知を送信",
      loadRulesFailed: "通知ルールを読み込めません。",
      testNotificationSent: "テスト通知を送信しました。",
      sendTestNotificationFailed: "テスト通知を送信できません。",
      createRule: "ルールを作成",
      editRule: "ルールを編集",
      dialogDescription: "この組織の通知ルールを設定します。",
      ruleInfoSection: "ルール情報",
      scheduleSection: "スケジュール",
      sendScheduleSection: "送信時刻",
      checkSection: "チェック頻度",
      conditionSection: "条件",
      deliverySection: "配信",
      summarySection: "概要",
      liveSummaryDescription: "このルールの実行方法を確認します。",
      nameLabel: "名前",
      siteLabel: "サイト",
      chooseSite: "サイトを選択",
      ruleTypeLabel: "ルール種別",
      recipientLabel: "受信者",
      enabledLabel: "有効",
      enabledHint: "このルールを実行",
      scheduleLabel: "スケジュール",
      timeLabel: "時刻",
      timezoneLabel: "タイムゾーン",
      intervalLabel: "間隔",
      dayLabel: "曜日",
      dayOfMonthLabel: "日",
      monthLabel: "月",
      reportPeriodLabel: "レポート期間",
      milestoneEveryLabel: "マイルストーンごと",
      matchLabel: "一致条件",
      matchAll: "すべて",
      matchAny: "いずれか",
      changeValueLabel: "変化量",
      changeModeLabel: "変化モード",
      changeModePercent: "パーセント",
      changeModeAbsolute: "絶対値",
      addCondition: "条件を追加",
      removeCondition: "削除",
      conditionItemTitle: "条件 {index}",
      metricLabel: "指標",
      windowLabel: "時間枠",
      operatorLabel: "演算子",
      valueLabel: "値",
      cooldownLabel: "クールダウン",
      cooldownDescription: "このクールダウン期間中、通知は再送信されません。",
      noDataHoursLabel: "データなし時間",
      pleaseChooseSite: "サイトを選択してください。",
      pleaseChooseRecipients: "受信者を 1 人以上選択してください。",
      ruleCreated: "ルールを作成しました。",
      ruleUpdated: "ルールを更新しました。",
      createRuleFailed: "ルールを作成できません。",
      updateRuleFailed: "ルールを更新できません。",
      deleteConfirm: "{name} を削除しますか？",
      ruleDeleted: "ルールを削除しました。",
      deleteRuleFailed: "ルールを削除できません。",
      lastChecked: "最終チェック",
      actions: "操作",
      edit: "編集",
      enable: "有効化",
      disable: "無効化",
      delete: "削除",
      saveRule: "ルールを保存",
      preview: "プレビュー",
      runNow: "今すぐ実行",
      previewFailed: "ルールをプレビューできません。",
      runFailed: "ルールを実行できません。",
      runResultToast:
        "{messages} 件のメッセージを作成しました。メール送信 {sent} 件、失敗 {failed} 件。",
      previewDialogTitle: "ルールプレビュー",
      previewDialogDescription:
        "メッセージ作成やメール送信をせずに、このルールを評価します。",
      coolingDownUntil: "{time} までクールダウン中",
      scheduleDaily: "毎日 {time}",
      scheduleWeekly: "毎週 {day} {time}",
      scheduleMonthly: "毎月 {day} 日 {time}",
      scheduleQuarterly: "四半期ごと {day} 日 {time}",
      scheduleYearly: "毎年 {month}/{day} {time}",
      scheduleInterval: "{minutes} 分ごと",
      scheduleCustom: "カスタム",
      conditionReport: "{period} レポート",
      summaryWhenConditions:
        "次の条件のうち {combinator} が一致したら、{type} 通知を送信します：",
      summaryWhenSingleCondition:
        "この条件が一致したら、{type} 通知を送信します：",
      summaryConditionThreshold: "{window} {metric} {operator} {value}",
      summaryConditionChange:
        "{window} {metric} {mode} 変化 {operator} {value}",
      summaryReportSchedule: "{period}：{schedule}",
      summaryMilestoneCondition: "{metric} が {step} ごとに到達",
      summaryHealthCondition: "{hours} 時間データなし",
      defaultNames: {
        report: "{site} 日次レポート",
        milestone: "{site} トラフィックマイルストーン",
        threshold: "{site} トラフィックしきい値",
        change: "{site} トラフィック変化",
        health: "{site} 健全性チェック",
      },
      columns: {
        name: "名前",
        type: "種別",
        site: "サイト",
        recipient: "受信者",
        schedule: "スケジュール",
        condition: "条件",
        nextRun: "次回実行",
        status: "ステータス",
      },
      status: {
        enabled: "有効",
        disabled: "無効",
      },
      nextRunStates: {
        disabled: "無効",
        coolingDown: "クールダウン中",
        dueNow: "期限到来",
      },
      previewFields: {
        status: "ステータス",
        summary: "概要",
        title: "タイトル",
        htmlPreview: "HTML プレビュー",
        bodyText: "本文テキスト",
        createdAt: "作成日時",
        updatedAt: "更新日時",
        loadingContent: "評価済みレポート内容を読み込み中",
        noHtmlPreview: "このプレビューには HTML コンテンツがありません。",
      },
      ruleTypes: {
        report: "レポート",
        milestone: "マイルストーン",
        threshold: "しきい値",
        change: "変化",
        health: "健全性",
        test: "テスト",
      },
      ruleTypeDescriptions: {
        report: "スケジュールに従ってサイト概要を送信",
        milestone: "指標が各ステップに到達したときに通知",
        threshold: "指標が上限または下限を超えたときに通知",
        change: "前期間比の変動を通知",
        health: "トラッキングが途絶えたときに通知",
      },
      recipientModes: {
        creator: "作成者",
        team_admins: "組織の管理者",
        all_team_members: "全メンバー",
        users: "選択したユーザー",
      },
      recipientKindLabel: "受信者種別",
      recipientPresetLabel: "プリセット",
      customRecipientsEmpty: "受信者が選択されていません",
      noTeamMembers: "組織のメンバーはまだいません。",
      recipientKinds: {
        preset: "プリセット",
        custom: "カスタム",
      },
      scheduleKinds: {
        daily: "毎日",
        weekly: "毎週",
        monthly: "毎月",
        quarterly: "四半期ごと",
        yearly: "毎年",
        interval: "間隔",
      },
      reportPeriods: {
        daily: "日次レポート",
        weekly: "週次レポート",
        monthly: "月次レポート",
        quarterly: "四半期レポート",
        yearly: "年次レポート",
      },
      cooldownUnits: {
        minutes: "分",
        hours: "時間",
        days: "日",
      },
      intervalOptions: {
        every30Minutes: "30 分ごと",
        everyHour: "1 時間ごと",
        every6Hours: "6 時間ごと",
        every12Hours: "12 時間ごと",
        everyDay: "毎日",
        every7Days: "7 日ごと",
        every30Days: "30 日ごと",
      },
      weekDays: ["日", "月", "火", "水", "木", "金", "土"],
      metrics: {
        views: "表示回数",
        visitors: "訪問者",
        sessions: "セッション",
      },
      windows: {
        last_1h: "直近 1 時間",
        last_24h: "直近 24 時間",
        yesterday: "昨日",
      },
      addSiteFirst: "先にサイトを追加してください。",
      deleteDescription: "この操作は元に戻せません。",
      previewStatuses: {
        skipped: "スキップ",
        checked: "未発火",
        triggered: "発火",
      },
    },
    publicLinks: {
      copyLink: "リンクをコピー",
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
    scheduledTasks: {
      empty: "スケジュールタスクはまだありません。",
      refresh: "更新",
      loadFailed: "スケジュールタスクを読み込めません。",
      loadMore: "さらに読み込む",
      allStatuses: "すべてのステータス",
      runs24h: "24時間以内の実行回数",
      successRate24h: "24時間以内の成功率",
      problemRuns24h: "異常な実行回数",
      failed: "失敗",
      partial: "一部完了",
      lastRun: "最終実行",
      staleRunning: "長時間未完了の実行",
      taskListTitle: "タスク",
      task: "タスク",
      schedule: "スケジュール",
      enabled: "状態",
      enabledYes: "有効",
      enabledNo: "無効",
      taskStateSaved: "タスク状態を更新しました。",
      taskStateSaveFailed: "タスク状態を更新できません。",
      lastStatus: "最終ステータス",
      runs30d: "30日実行",
      successRate30d: "30日成功率",
      avgDuration: "平均所要時間",
      runHistoryTitle: "実行履歴",
      nextRun: "次回実行",
      noRuns: "実行はまだありません。",
      scheduledAt: "予定",
      startedAt: "開始",
      finishedAt: "終了",
      trigger: "トリガー",
      tasks: "タスク",
      taskCount: "タスク",
      subtaskCount: "サブタスク",
      taskResult: "タスク結果",
      statusLabel: "ステータス",
      duration: "所要時間",
      sites: "サイト",
      hours: "時間",
      rows: "行",
      rulesScanned: "ルール",
      messagesCreated: "メッセージ",
      emailFailed: "メール失敗",
      logs: "ログ",
      viewLogs: "ログを表示",
      logTitle: "実行ログ",
      noRunSelected: "ログを確認する実行を選択してください。",
      noLogs: "この実行にログはありません。",
      error: "エラー",
      status: {
        running: "実行中",
        success: "成功",
        partial: "一部完了",
        failed: "失敗",
        skipped: "スキップ",
      },
      taskDefinitions: {
        visit_hourly_rollup: {
          name: "時間別訪問集計",
          description:
            "終了した訪問を時間ごとの合計に集計し、レポートに使用します。",
          schedule: "毎時",
        },
        notification_tick: {
          name: "通知配信",
          description: "通知ルールを評価し、メッセージを配信します。",
          schedule: "30分ごと",
        },
        database_maintenance: {
          name: "データベースメンテナンス",
          description:
            "期限切れのタスク実行記録と通知を削除し、データベースを最適化します。",
          schedule: "毎日",
        },
      },
      keptForDays: "{days} 日間保持",
    },
  },
  adminUsers: {
    columns: {},
  },
  adminSites: {
    createTitle: "サイトを追加",
    name: "名前（任意）",
    domain: "ドメイン",
    create: "サイトを追加",
    creating: "追加中...",
    createSuccess: "サイトを追加しました。",
    createFailed: "サイトを追加できませんでした。もう一度お試しください。",
    invalidDomain: "example.com のようなドメインを入力してください。",
    columns: {},
  },
  adminTeams: {
    columns: {},
  },
  requestObservation: {
    blockedTotal: "ブロックしたリクエスト",
    retentionNote:
      "30 日間保持します。許可されたトラフィックは各サイトのダッシュボードにあります。",
    topReasons: "理由",
    recentTitle: "最近ブロックしたリクエスト",
    categoryLabels: {
      custom_block: "ブロックルール",
      bot: "ボット",
      suspected_bot: "ホスティングネットワーク",
    },
    tabs: {},
    refresh: "更新",
    loadFailed: "ブロックされたリクエストを読み込めません。",
    noData: "この期間にブロックされたリクエストはありません。",
    time: "時刻",
    site: "サイト",
    location: "地域",
    network: "ネットワーク",
    reason: "理由",
    userAgent: "User-Agent",
    emptyValue: "不明",
    pathname: "パス",
    country: "国 / 地域",
    ipPrefix: "IP プレフィックス",
    botReasonLabels: {
      missing_ua: "User-Agent なし",
      ua_too_long: "User-Agent が長すぎます",
      ua_isbot: "User-Agent が Bot と一致",
      script_ua: "スクリプトクライアント User-Agent",
      cf_bot_score_low: "Cloudflare Bot スコアが低い",
      cf_verified_bot_category: "Cloudflare 認証済み Bot カテゴリ",
      hosting_asn: "ホスティング ASN",
      network_service_asn: "ネットワークサービス ASN",
      transit_asn: "トランジット ASN",
      access_asn: "アクセス ASN",
      missing_browser_provenance: "ブラウザー由来情報なし",
      origin_hostname_mismatch: "オリジンとホスト名の不一致",
      custom_block: "カスタムブロックルールに一致",
      blocked_domains: "ブロック対象ドメイン",
      blocked_paths: "ブロック対象パス",
      blocked_query_parameters: "ブロック対象クエリパラメータ",
      blocked_referrers: "ブロック対象リファラー",
      blocked_user_agents: "ブロック対象 User-Agent",
      blocked_ips: "ブロック対象 IP",
      blocked_asns: "ブロック対象 ASN",
      blocked_countries: "ブロック対象国",
      blocked_regions: "ブロック対象地域",
    },
    requestKindLabels: {},
    overviewLabels: {
      windowDays: "過去 {days} 日",
    },
    normalDetail: {},
  },
  systemSettings: {
    notificationEmailTitle: "メール通知",
    emailGatewayNotReady:
      "この Every App ゲートウェイではメールが設定されていません。",
    emailSenderLabel: "送信者",
    retentionTitle: "運用データの保持期間",
    retentionDescription:
      "タスク実行、タスクログ、通知メッセージ、詳細な分析データの保持期間を設定します。タスクと通知の変更は新しいレコードにのみ適用されます。新しい期間より古い詳細な分析データは、次回の日次実行で削除されます。",
    scheduledTaskLogsDaysLabel: "スケジュールタスクの実行とログ（日）",
    notificationTestDaysLabel: "テスト通知（日）",
    notificationAttentionDaysLabel: "警告・重大通知（日）",
    notificationDefaultDaysLabel: "その他の通知（日）",
    analyticsDetailDaysLabel:
      "詳細な分析データ：ページビューとイベント（日数。時間ごとの集計は保持）",
    retentionRangeHint: "1〜3650 の整数日を入力してください。",
    retentionSave: "保持期間を保存",
    retentionSaving: "保存中...",
    retentionSaved: "保持期間を保存しました。",
    retentionSaveFailed: "保持期間を保存できません。",
    enabledOn: "有効",
    enabledOff: "無効",
    cancel: "キャンセル",
    retentionLowerTitle: "古い分析データを削除しますか？",
    retentionLowerDescription:
      "{days} 日より古いページビューとイベントは、次回の日次実行で削除されます。時間ごとの合計は保持されます。この操作は元に戻せません。",
    retentionLowerConfirm: "保存して削除",
  },
  systemPerformance: {
    refresh: "更新",
    loadFailed: "取り込みデータを読み込めません。",
    noData: "この期間に取り込みデータはありません。",
    range15m: "過去 15 分",
    range1h: "過去 1 時間",
    range6h: "過去 6 時間",
    range24h: "過去 24 時間",
    totalEvents: "受理イベント",
    p95Latency: "P95 推定遅延",
    p50Latency: "P50",
    p75Latency: "P75",
    p50Label: "P50",
    p75Label: "P75",
    p95Label: "P95",
    dataFreshness: "データ鮮度",
    noRecentWrite: "最近の書き込みなし",
    clockAnomalies: "時計 / 遅延異常",
    delayed: "遅延",
    future: "未来のタイムスタンプ",
    latencyPercentileTrend: "遅延パーセンタイル推移",
    latencyPercentileTrendDescription:
      "受信イベントの P50、P75、P95 推定遅延を表示します。",
    throughputTrend: "受理イベントスループット",
    throughputTrendDescription: "受信イベントのスループットを表示します。",
    visits: "訪問",
    customEvents: "カスタムイベント",
    anomalyBucket: "異常分類",
    openVisitHealth: "未終了訪問バックログ",
    openVisitHealthDescription: "まだ終了していない訪問です。",
    open: "未終了",
    stale: "停滞",
    timedOut: "タイムアウト",
    oldestOpen: "最古の未終了",
    latestActivity: "最新アクティビティ",
    latencySampleHealth: "遅延サンプルの健全性",
    latencySampleHealthDescription: "信頼イベントの遅延を表示します。",
    trustedSamples: "信頼サンプル",
    topSitesTitle: "システム負荷上位サイト",
    topSitesDescription: "現在受信イベント数が最も多いサイトです。",
    events: "イベント",
    avgLatency: "平均遅延",
    slowestEventsTitle: "推定最遅イベント",
    slowestEventsDescription: "発生から保存までの遅延が最も長いイベントです。",
    eventTime: "イベント時刻",
    serverTime: "サーバー書き込み時刻",
    estimatedDelay: "推定遅延",
    doDiagnosticTitle: "バッファ中のデータ",
    doDiagnosticDescription:
      "各サイトでまだ保存されていないデータを確認します。",
    doDiagnosticLoadFailed: "バッファ中のデータを確認できません。",
    doDiagnosticLoading: "各サイトを確認中…",
    doDiagnosticRun: "バッファ中のデータを確認",
    doDiagnosticEmpty: "バッファ中のデータはありません。",
    doDiagnosticUnreachable: "到達できないサイト",
    doDiagnosticReachableSites: "到達可能なサイト",
    doDiagnosticTotalSites: "総サイト数",
    doDiagnosticActiveAlarms: "アクティブなアラームタイマー",
    doDiagnosticBufferedVisits: "バッファ済み訪問",
    doDiagnosticOpenVisits: "バッファ内未終了行",
    doDiagnosticOpenStale: "未終了アイドル >30分",
    doDiagnosticOpenTimedOut: "未終了アイドル >12時間",
    doDiagnosticOpenHardAged: "開始から >36時間",
    doDiagnosticOpenFutureSkew: "未来のタイムスタンプ",
    doDiagnosticStuckDirty: "未フラッシュで停滞",
    doDiagnosticMaxFlushAttempts: "最大再試行回数",
    doDiagnosticBufferedCustomEvents: "バッファ済みカスタムイベント",
    doDiagnosticOldestOpen: "最も古い未終了の訪問",
    doDiagnosticFutureMaxActivity: "未来側に最もずれた最終活動時刻",
    doDiagnosticSiteList: "リスク上位サイト",
    doDiagnosticSiteListDescription: "リスクが最も高い 20 サイト。",
    doDiagnosticSiteFailed: "到達不能",
    doDiagnosticSiteOpen: "未終了",
    doDiagnosticSiteStuck: "停滞",
    doDiagnosticSiteFuture: "未来のタイムスタンプ",
    doDiagnosticSiteHardAged: "36時間超過",
    doDiagnosticSiteAlarm: "アラーム",
    doDiagnosticSiteAlarmNone: "なし",
    doDiagnosticSiteAlarmDue: "期限到来",
    doDiagnosticSiteNextDue: "次回期限",
    doDiagnosticSiteNextDueFlush: "フラッシュ",
    doDiagnosticSiteNextDueHidden: "非表示フォールバック",
    doDiagnosticSiteNextDueTimeout: "訪問タイムアウト",
    doDiagnosticSiteResponseMs: "応答時間",
    doDiagnosticHealthy: "異常なバッファ行は検出されませんでした。",
  },
  loginForm: {},
  logoutAction: {},
  sidebarFooter: {
    gateway: "Every App に戻る",
  },
  appNav: {
    appearance: "外観",
    mainNavigation: "メインナビゲーション",
    toggleSidebar: "サイドバーを切り替え",
    sources: "流入元",
    audience: "オーディエンス",
    goals: "目標",
    sites: "サイト",
    allSites: "すべてのサイト",
    inbox: "受信トレイ",
    settings: "設定",
    switchSite: "サイトを切り替え",
    siteSettings: "サイト設定",
    addSite: "サイトを追加",
    sections: "セクション",
  },
  teamEntry: {},
  getStarted: {
    title: "はじめに",
    progress: "{done} / {total}",
    showSteps: "ステップを表示",
    hideSteps: "ステップを隠す",
    completed: "{count} 件完了",
    steps: {
      site: "最初のサイトを追加",
      tracking: "ウェブサイトを計測する",
      team: "メンバーを招待",
      notifications: "レポートをメールで受け取る",
      sharing: "公開ダッシュボードを共有",
    },
    noSitesTitle: "最初のサイトを追加",
    memberNoSitesTitle: "サイトはまだありません",
    memberNoSitesDescription: "管理者に追加を依頼してください。",
    addSite: "サイトを追加",
    waitingTitle: "最初のページビューを待っています",
    copy: "コピー",
    copied: "コピーしました",
  },
  settingsNav: {
    label: "設定",
    system: "システムの状態",
    account: "アカウント",
    notifications: "通知",
    cancel: "キャンセル",
  },
  systemHealth: {
    tabs: {
      tasks: "スケジュールタスク",
      blocked: "ブロックされたリクエスト",
      ingestion: "データ受信",
      data: "データ",
    },
  },
} as AppMessages;

const DICTIONARIES: Record<Locale, AppMessages> = {
  en: enMessages,
  zh: zhMessages,
  "zh-tw": zhTwMessages,
  ja: jaMessages,
};

export function getMessages(locale: Locale): AppMessages {
  return DICTIONARIES[locale];
}
