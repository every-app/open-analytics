// @generated from src/i18n/en.yaml by scripts/i18n-check.
import type { Locale } from "./config";

export interface AppMessages {
  appName: string;
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
    milestonesUnreadLabel: string;
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
      deliveryTestTitle: string;
      inAppTestHint: string;
      emailTestConfiguredHint: string;
      sendTestNotification: string;
      loadRulesFailed: string;
      testNotificationSent: string;
      testNotificationSentNoEmail: string;
      sendTestNotificationFailed: string;
      createRule: string;
      editRule: string;
      dialogDescription: string;
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
      runFailedWithReason: string;
      previewFailedWithReason: string;
      runNotTriggered: string;
      runSkipped: string;
      runNoRecipients: string;
      runSentOne: string;
      runSentMany: string;
      runEmailFailed: string;
      runEmailNotSetUp: string;
      runEmailSent: string;
      runEmailOff: string;
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
      triggerTypes: {
        manual: string;
        cron: string;
        retry: string;
      };
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
        analytics_retention: {
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
      windowDay: string;
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
  sidebarHeader: {
    everyApp: string;
    backToEveryApp: string;
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
    firstViewsTitle: "Your first page views are in.",
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
    loadMoreError: "Couldn't load more pages.",
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
    loadError: "Couldn't load sessions.",
    empty: "No sessions in this time range.",
  },
  sessionDetail: {
    anonymous: "Anonymous",
    userId: "User ID",
    userName: "User name",
    back: "Back to sessions",
    missing: "Missing sessionId.",
    notFound: "Session not found.",
    loadError: "Couldn't load session detail.",
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
    loadError: "Couldn't load visitors.",
    empty: "No visitors in this time range.",
  },
  visitorDetail: {
    anonymous: "Anonymous",
    userId: "User ID",
    userName: "User name",
    back: "Back to visitors",
    missing: "Missing visitorId.",
    notFound: "Visitor not found.",
    loadError: "Couldn't load visitor detail.",
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
    loadError: "Couldn't load retention data.",
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
    milestonesUnreadLabel: "Unread badge for milestones",
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
      body: "Reports and alerts you turn on arrive under Notifications in OpenAnalytics and, when email is set up on this gateway, by email too.",
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
      deliveryTestTitle: "Delivery test",
      inAppTestHint: "Sends you an in-app notification.",
      emailTestConfiguredHint: "Sends you a test email.",
      sendTestNotification: "Send test notification",
      loadRulesFailed: "Couldn't load notification rules.",
      testNotificationSent: "Test notification sent.",
      testNotificationSentNoEmail:
        "Test notification sent. No email went out: email isn't set up on this gateway.",
      sendTestNotificationFailed: "Couldn't send the test notification.",
      createRule: "Create rule",
      editRule: "Edit rule",
      dialogDescription: "Set up a notification rule for this organization.",
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
      cooldownDescription: "Wait this long before notifying again.",
      noDataHoursLabel: "Hours without data",
      pleaseChooseSite: "Choose a site.",
      pleaseChooseRecipients: "Choose at least one recipient.",
      ruleCreated: "Rule created.",
      ruleUpdated: "Rule updated.",
      createRuleFailed: "Couldn't create the rule.",
      updateRuleFailed: "Couldn't update the rule.",
      deleteConfirm: 'Delete "{name}"?',
      ruleDeleted: "Rule deleted.",
      deleteRuleFailed: "Couldn't delete the rule.",
      lastChecked: "Last checked",
      actions: "Actions",
      edit: "Edit",
      enable: "Enable",
      disable: "Disable",
      delete: "Delete",
      saveRule: "Save rule",
      preview: "Preview",
      runNow: "Run now",
      previewFailed: "Couldn't preview the rule.",
      runFailed: "Couldn't run the rule.",
      runFailedWithReason: "Couldn't run the rule: {reason}",
      previewFailedWithReason: "Couldn't preview the rule: {reason}",
      runNotTriggered: "Checked. Nothing to send right now.",
      runSkipped:
        "Couldn't check this rule: its site is missing or its condition isn't valid. Edit the rule.",
      runNoRecipients:
        "No one to send to: no member of this organization matches this rule's recipients.",
      runSentOne: "Sent 1 notification.",
      runSentMany: "Sent {count} notifications.",
      runEmailFailed: "Email failed for {failed} of them.",
      runEmailNotSetUp:
        "No email went out: email isn't set up on this gateway.",
      runEmailSent: "Email went out to {sent} of them.",
      runEmailOff: "Email is off in their notification preferences.",
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
      conditionReport: "{period}",
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
        status: "Result",
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
        creator: "Rule creator",
        team_admins: "Organization admins",
        all_team_members: "All members",
        users: "Selected users",
      },
      recipientKindLabel: "Send to",
      recipientPresetLabel: "Group",
      customRecipientsEmpty: "No recipients selected",
      noTeamMembers: "No organization members yet.",
      recipientKinds: {
        preset: "A group",
        custom: "Specific people",
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
      loadFailed: "Couldn't load scheduled tasks.",
      loadMore: "Load more",
      allStatuses: "All statuses",
      runs24h: "Runs (last 24 hours)",
      successRate24h: "Success rate (last 24 hours)",
      problemRuns24h: "Failed or partial runs",
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
      taskStateSaveFailed: "Couldn't update task state.",
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
      triggerTypes: {
        manual: "Manual",
        cron: "Scheduled",
        retry: "Retry",
      },
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
        analytics_retention: {
          name: "Analytics retention",
          description:
            "Deletes expired page views and events. Hourly totals are kept.",
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
      windowDay: "Last 24 hours",
      windowDays: "Last {days} days",
    },
    normalDetail: {},
  },
  systemSettings: {
    notificationEmailTitle: "Email notifications",
    emailGatewayNotReady:
      "Email isn't set up on this gateway. An admin sets the sender with {command} after setting up a sending domain.",
    emailSenderLabel: "Sender",
    retentionTitle: "Data retention",
    retentionDescription:
      "Configure how long task runs, task logs, notification messages and detailed analytics remain available. Task and notification changes affect new records only; detailed analytics older than the new limit are deleted on the next daily run.",
    scheduledTaskLogsDaysLabel: "Scheduled task logs and runs (days)",
    notificationTestDaysLabel: "Test notifications (days)",
    notificationAttentionDaysLabel: "Warning and critical notifications (days)",
    notificationDefaultDaysLabel: "Other notifications (days)",
    analyticsDetailDaysLabel:
      "Page views and events (days; hourly totals are kept)",
    retentionRangeHint: "Enter an integer from 1 to 3650 days.",
    retentionSave: "Save retention settings",
    retentionSaving: "Saving...",
    retentionSaved: "Retention settings saved.",
    retentionSaveFailed: "Couldn't save retention settings.",
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
  sidebarHeader: {
    everyApp: "Every App",
    backToEveryApp: "Back to Every App",
  },
  appNav: {
    appearance: "Appearance",
    mainNavigation: "Main navigation",
    toggleSidebar: "Toggle sidebar",
    sources: "Sources",
    audience: "Audience",
    goals: "Conversions",
    sites: "Sites",
    allSites: "All sites",
    inbox: "Notifications",
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
    system: "System health",
    account: "Account",
    notifications: "Notification rules",
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

const DICTIONARIES: Record<Locale, AppMessages> = {
  en: enMessages,
};

export function getMessages(locale: Locale): AppMessages {
  return DICTIONARIES[locale];
}
