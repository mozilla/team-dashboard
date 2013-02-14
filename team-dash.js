var bzapi = bz.createClient({ test: false });

// Various utility functions.

function displaySectionTextInDiv(divID, section, additionalText) {
  var d = document.getElementById(divID);
  d.innerHTML = "<b>"+ section + "</b><br><br>" + additionalText;
}

function getTeamMemberIDs() {
  var memberIDs = [teamMembers.length];
  for (var i = 0; i < teamMembers.length; i++) {
    memberIDs[i] = teamMembers[i].id;
  }
  return memberIDs;
}

function getTeamNameForID(id) {
  for (var i = 0; i < teamMembers.length; i++) {
    if (teamMembers[i].id == id) {
      return teamMembers[i].name;
    }
  }
  return id;
}

function isTeamMember(id) {
  for (var i = 0; i < teamMembers.length; i++) {
    if (teamMembers[i].id == id) {
      return true;
    }
  }
  return false;
}

function getHTMLBugNumberList(bugs) {
  var output = "<ul>";
  for (var i = 0; i < bugs.length; i++) {
    var bugnumber = bugs[i].id;
    var bugsummary = bugs[i].summary;
    output += "<li><a href='https://bugzilla.mozilla.org/show_bug.cgi?id=" + bugnumber + "'>" + bugnumber + "</a>: " + bugsummary + "</li>";
  }
  output += "</ul>";
  return output;
}

// Query Building

function addTeamComponentsToQuery(query) {
  query.component = teamComponents;
  query.component_type = "equals_any";
}

function addSecurityStatusToQuery(query) {
  query.keywords = ['sec-moderate', 'sec-high', 'sec-critical'];
  query.keywords_type = "contains_any";
}

function addOpenStatusToQuery(query) {
  query.status = ['UNCONFIRMED', 'NEW', 'ASSIGNED', 'REOPENED'];
  query.status_type = "equals_any";
}

function addClosedStatusToQuery(query) {
  query.status = ['RESOLVED', 'VERIFIED', 'CLOSED'];
  query.status_type = "equals_any";
}

function addFixedStatusToQuery(query) {
  query.resolution = ['FIXED'];
  query.resolution_type = "equals_any";
}

// Security data

var securitySectionHeader = "Security Bugs (public, moderate or higher)";
var gotSecDataError = false;
var gotOpenSecBugs = false;
var openSecBugs;
function gotAllSecData() {
  return gotOpenSecBugs;
}

// Bug fix data

var fixedBugsSectionHeader = "Fixed Bugs";
var gotFixedBugsDataError = false;
var gotPastDayFixedBugs = false;
var pastDayFixedBugs;
var gotTwoDaysAgoFixedBugs = false;
var twoDaysAgoFixedBugs;
var gotPastYearFixedBugsCount = false;
var pastYearFixedBugsCount;
function gotAllBugFixData() {
  return gotPastDayFixedBugs && gotPastYearFixedBugsCount && gotTwoDaysAgoFixedBugs;
}

// Reviews data

var reviewsSectionHeader = "Reviews";
var gotReviewsDataError = false;
var bugsWithRequestsQueryCount = 0;
var gotBugsWithRequests = 0;
var bugsWithRequests = [];
function gotAllReviewsData() {
  return (gotBugsWithRequests == bugsWithRequestsQueryCount);
}

// Display functions

function displaySecData() {
  if (gotSecDataError) {
    displaySectionTextInDiv("secBugsDiv", securitySectionHeader, "Error retrieving data!");
    return;
  }
  
  var output = "Open now: ";
  if (openSecBugs.length == 0) {
    output += "None, excellent!";
  } else {
    output += getHTMLBugNumberList(openSecBugs);
  }
 
  displaySectionTextInDiv("secBugsDiv", securitySectionHeader, output);
}

function displayFixedBugData() {
  if (gotFixedBugsDataError) {
    displaySectionTextInDiv("fixedBugsDiv", fixedBugsSectionHeader, "Error retrieving data!");
    return;
  }
  
  var output = "Fixed in the past day: ";
  if (pastDayFixedBugs.length == 0) {
    output += "None<br><br>";
  } else {
    output += getHTMLBugNumberList(pastDayFixedBugs);
  }
  
  output += "Fixed two days ago: ";
  if (twoDaysAgoFixedBugs.length == 0) {
    output += "None<br><br>";
  } else {
    output += getHTMLBugNumberList(twoDaysAgoFixedBugs);
  }
  
  output += "Fixed in the past year: " + pastYearFixedBugsCount;
  
  displaySectionTextInDiv("fixedBugsDiv", fixedBugsSectionHeader, output);
}

function displayReviewsData() {
  if (gotReviewsDataError) {
    displaySectionTextInDiv("reviewsDiv", reviewsSectionHeader, "Error retrieving data!");
    return;
  }

  var output = "Outstanding review/feedback requests for network team members: ";
  if (bugsWithRequests.length == 0) {
    output += "None<br><br>";
  } else {
    output += "<ul>";
    var atLeastOneRelevantRequest = false;
    for (var i = 0; i < bugsWithRequests.length; i++) {
      var bug = bugsWithRequests[i];
      var bugnumber = bug.id;
      var bugsummary = bug.summary;
      bugsummary = bugsummary.replace("\"", "&quot;");
      bugsummary = bugsummary.replace("\'", "&apos;");
      for (var j = 0; j < bug.attachments.length; j++) {
        var attachment = bug.attachments[j];
        if (attachment.is_obsolete || !attachment.flags) {
          continue;
        }
        for (var k = 0; k < attachment.flags.length; k++) {
          var flag = attachment.flags[k];
          if (!flag.requestee || flag.status != "?") {
            continue;
          }
          if (flag.name != "review" && flag.name != "feedback") {
            continue;
          }
          var requestee = flag.requestee;
          if (!isTeamMember(requestee.name)) {
            continue;
          }
          atLeastOneRelevantRequest = true;
          var requester = flag.setter;
          var requesteeFirstName = getTeamNameForID(requestee.name);
          var requesterFirstName = getTeamNameForID(requester.name);
          output += "<li>";
          output += requesteeFirstName + " owes " + requesterFirstName;
          output += ((flag.name == "review") ? " a review " : " feedback ");
          output += "on bug <a href='https://bugzilla.mozilla.org/show_bug.cgi?id=" + bugnumber + "' title='" + bugsummary + "'>" + bugnumber + "</a>.";
          output += "</li>";
        }
      }
    }
    if (!atLeastOneRelevantRequest) {
      output += "<li>None!</li>";
    }
    output += "</ul>";
  }
  
  displaySectionTextInDiv("reviewsDiv", reviewsSectionHeader, output);
}

// Security data callbacks

function openSecBugsCallback(error, bugs) {
  gotOpenSecBugs = true;
  if (error) {
    gotSecDataError = true;
  } else {
    openSecBugs = bugs;
  }
  
  if (gotAllSecData()) {
    displaySecData();
  }
}

// Bug fix callbacks

function pastYearBugsFixedCountCallback(error, count) {
  gotPastYearFixedBugsCount = true;
  if (error) {
    gotFixedBugsDataError = true;
  } else {
    pastYearFixedBugsCount = count;
  }
  
  if (gotAllBugFixData()) {
    displayFixedBugData();
  }
}

function pastDayFixedBugsCallback(error, bugs) {
  gotPastDayFixedBugs = true;
  if (error) {
    gotFixedBugsDataError = true;
  } else {
    pastDayFixedBugs = bugs;
  }
  
  if (gotAllBugFixData()) {
    displayFixedBugData();
  }
}

function twoDaysAgoFixedBugsCallback(error, bugs) {
  gotTwoDaysAgoFixedBugs = true;
  if (error) {
    gotFixedBugsDataError = true;
  } else {
    twoDaysAgoFixedBugs = bugs;
  }
  
  if (gotAllBugFixData()) {
    displayFixedBugData();
  }
}

// Review requests callbacks

function bugsWithRequestsCallback(error, bugs) {
  gotBugsWithRequests++;
  if (error) {
    gotReviewsDataError = true;
  } else {
    // This list should not contain duplicates.
    for (var i = 0; i < bugs.length; i++) {
      var found = false;
      var currentBugID = bugs[i].id;
      for (var j = 0; j < bugsWithRequests.length; j++) {
        if (bugsWithRequests[j].id == currentBugID) {
          found = true;
          break;
        }
      }
      if (!found) {
        bugsWithRequests.push(bugs[i]);
      }
    }
  }
  
  if (gotAllReviewsData()) {
    displayReviewsData();
  }
}

// Main loading function

function fetchAllData() {
  startPageReloadTimer();
  
  var currentDate = new Date();
  var loadTimeDiv = document.getElementById("loadTimeDiv");
  loadTimeDiv.innerHTML = "Data from " + currentDate.toLocaleString() + ". Should refresh every fifteen minutes.";
  
  // Security
  
  displaySectionTextInDiv("secBugsDiv", securitySectionHeader, "Retrieving security bug data...");

  var openSecBugsQuery = {};
  addSecurityStatusToQuery(openSecBugsQuery);
  addTeamComponentsToQuery(openSecBugsQuery);
  addOpenStatusToQuery(openSecBugsQuery);
  bzapi.searchBugs(openSecBugsQuery, openSecBugsCallback);
  
  // Bug fixes
  
  displaySectionTextInDiv("fixedBugsDiv", fixedBugsSectionHeader, "Retrieving bug fix data...");
  
  var lastYearBugsFixedCountQuery = {
  changed_after: "-1y",
  changed_before: "now",
  changed_field: "resolution",
  changed_field_to: ['FIXED']
  };
  addTeamComponentsToQuery(lastYearBugsFixedCountQuery);
  addFixedStatusToQuery(lastYearBugsFixedCountQuery);
  bzapi.countBugs(lastYearBugsFixedCountQuery, pastYearBugsFixedCountCallback);
  
  var pastDayFixedBugsQuery = {
  changed_after: "-1d",
  changed_before: "now",
  changed_field: "resolution",
  changed_field_to: ['FIXED']
  };
  addTeamComponentsToQuery(pastDayFixedBugsQuery);
  addFixedStatusToQuery(pastDayFixedBugsQuery);
  bzapi.searchBugs(pastDayFixedBugsQuery, pastDayFixedBugsCallback);
  
  var twoDaysAgoFixedBugsQuery = {
  changed_after: "-2d",
  changed_before: "-1d",
  changed_field: "resolution",
  changed_field_to: ['FIXED']
  };
  addTeamComponentsToQuery(twoDaysAgoFixedBugsQuery);
  addFixedStatusToQuery(twoDaysAgoFixedBugsQuery);
  bzapi.searchBugs(twoDaysAgoFixedBugsQuery, twoDaysAgoFixedBugsCallback);
  
  // Reviews
  
  displaySectionTextInDiv("reviewsDiv", reviewsSectionHeader, "Retrieving review data...");
  
  var teamMemberIDs = getTeamMemberIDs();
  for (var i = 0; i < teamMemberIDs.length; i++) {
    bugsWithRequestsQueryCount++;
    var bugsWithRequestsQuery = {
      'field0-0-0': 'flag.requestee',
      'type0-0-0': 'contains_any',
      'value0-0-0': teamMemberIDs[i],
      include_fields: 'id,attachments,summary'
    };
    addTeamComponentsToQuery(bugsWithRequestsQuery);
    bzapi.searchBugs(bugsWithRequestsQuery, bugsWithRequestsCallback);
  }
}
