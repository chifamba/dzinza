# To-Do List

This document outlines the to-do list for the FamilyTree project, organized by microservice.

## Admin Moderation Service

- [ ] **Report Content:** Create API endpoint for users to report content
- [ ] **View Reported Content:** Create API endpoint for moderators to view a queue of reported content
- [ ] **Approve Content:** Create API endpoint for moderators to approve reported content
- [ ] **Reject Content:** Create API endpoint for moderators to reject reported content
- [ ] **Delete Content:** Create API endpoint for moderators to delete reported content
- [ ] **Ban User:** Create API endpoint for moderators to ban a user
- [ ] **Suspend User:** Create API endpoint for moderators to suspend a user
- [ ] **Create Moderation Log Schema:** Create a database schema for logging moderation actions
- [ ] **Log Moderation Action:** Implement a service to log all moderation actions to the database

## Analytics Service

- [ ] **Track User Sign-ups:** Implement tracking for user sign-ups
- [ ] **Track User Logins:** Implement tracking for user logins
- [ ] **Track Session Duration:** Implement tracking for user session duration
- [ ] **Track API Usage:** Implement tracking for API endpoint usage
- [ ] **Create Daily Active Users Dashboard:** Create a dashboard to display daily active users
- [ ] **Create Monthly Active Users Dashboard:** Create a dashboard to display monthly active users
- [ ] **Create API Usage Dashboard:** Create a dashboard to display API usage patterns
- [ ] **Generate Demographic Reports:** Set up a process for generating weekly user demographic reports
- [ ] **Generate Behavior Reports:** Set up a process for generating weekly user behavior reports
- [ ] **Implement A/B Testing Backend:** Implement backend for A/B testing framework
- [ ] **Implement A/B Testing Frontend:** Implement frontend for A/B testing framework
- [ ] **Integrate with Grafana:** Integrate with Grafana for data visualization

## Audit History Service

- [ ] **Create Log Schema:** Create a database schema for logging user actions
- [ ] **Log Create Actions:** Implement a service to log user actions for creating data
- [ ] **Log Update Actions:** Implement a service to log user actions for updating data
- [ ] **Log Delete Actions:** Implement a service to log user actions for deleting data
- [ ] **Read Audit History:** Create an API endpoint to view the audit history for a specific user
- [ ] **Search Audit History:** Create an API endpoint to search the audit history
- [ ] **Detect Suspicious Activity:** Implement a system to detect suspicious activity (e.g., multiple failed login attempts)
- [ ] **Alert on Suspicious Activity:** Implement a system to send alerts for suspicious activity
- [ ] **Secure Audit Logs:** Ensure audit logs are stored securely and are tamper-proof

## Auth Service

- [ ] **Register User:** Create API endpoint for user registration
- [ ] **Login User:** Create API endpoint for user login
- [ ] **Generate Tokens:** Implement JWT generation for access and refresh tokens
- [ ] **Implement Google Login:** Implement Google social login
- [ ] **Implement Facebook Login:** Implement Facebook social login
- [ ] **Implement Email MFA:** Implement email-based MFA
- [ ] **Implement App MFA:** Implement authenticator app-based MFA
- [ ] **Create Role Schema:** Create a database schema for user roles and permissions
- [ ] **Assign Role:** Create API endpoint for assigning a user role
- [ ] **Revoke Role:** Create API endpoint for revoking a user role
- [ ] **Reset Password:** Implement password reset functionality via email
- [ ] **Recover Account:** Implement account recovery functionality

## Community Marketplace Service

- [ ] **Create Listing:** Create an API endpoint for users to create a new listing
- [ ] **Read Listing:** Create an API endpoint for users to view a specific listing
- [ ] **Read User's Listings:** Create an API endpoint for users to view their own listings
- [ ] **Update Listing:** Create an API endpoint for users to update a listing
- [ ] **Delete Listing:** Create an API endpoint for users to delete a listing
- [ ] **Search Listings:** Implement a search API for listings with keyword search
- [ ] **Filter Listings:** Implement filtering options for search API (e.g., by category, price)
- [ ] **Implement Messaging:** Implement a messaging system for buyers and sellers
- [ ] **Integrate Stripe:** Integrate with Stripe for payment processing
- [ ] **Integrate PayPal:** Integrate with PayPal for payment processing
- [ ] **Create Rating:** Create an API endpoint for users to submit a rating for a seller
- [ ] **Create Review:** Create an API endpoint for users to write a review for a seller

## Deduplication Service

- [ ] **Develop Name/DOB Algorithm:** Develop an algorithm to identify duplicate profiles based on name and date of birth
- [ ] **Develop Email Algorithm:** Develop an algorithm to identify duplicate profiles based on email address
- [ ] **Merge Profiles:** Create a process to merge two duplicate profiles
- [ ] **Implement Conflict Resolution:** Implement a conflict resolution strategy for merging data
- [ ] **Create Review UI:** Create a user interface for moderators to review potential duplicates
- [ ] **Create Manual Merge UI:** Create a user interface for moderators to manually merge profiles
- [ ] **Schedule Nightly Job:** Schedule a nightly job to check for new duplicate profiles
- [ ] **Monitor Accuracy:** Implement monitoring for the accuracy of the deduplication process
- [ ] **Monitor Effectiveness:** Implement monitoring for the effectiveness of the deduplication process

## Genealogy Service

- [ ] **Create Family Tree:** Create an API endpoint to create a new family tree
- [ ] **Read Family Tree:** Create an API endpoint to read a family tree
- [ ] **Add Family Member:** Create an API endpoint to add a family member to a tree
- [ ] **Update Family Member:** Create an API endpoint to edit a family member's details
- [ ] **Delete Family Member:** Create an API endpoint to remove a family member from a tree
- [ ] **Define Parent-Child Model:** Define data models for parent-child relationships
- [ ] **Define Spousal Model:** Define data models for spousal relationships
- [ ] **Visualize as Chart:** Implement a feature to visualize family trees as a chart
- [ ] **Visualize as Diagram:** Implement a feature to visualize family trees as a diagram
- [ ] **Export to GEDCOM:** Implement a feature to export family tree data to GEDCOM format
- [ ] **Import from GEDCOM:** Implement a feature to import family tree data from GEDCOM format

## Graph Query Service

- [ ] **Set up GraphQL Server:** Set up a GraphQL server
- [ ] **Define Schema:** Define the GraphQL schema for querying family tree data
- [ ] **Implement Resolvers:** Implement resolvers for the GraphQL schema
- [ ] **Add Auth Middleware:** Add authentication middleware to the GraphQL API
- [ ] **Add Authz Middleware:** Add authorization middleware to the GraphQL API
- [ ] **Create Schema Documentation:** Create documentation for the GraphQL schema
- [ ] **Create API Documentation:** Create documentation for using the GraphQL API
- [ ] **Log Queries:** Implement logging for all GraphQL queries
- [ ] **Monitor Query Performance:** Set up monitoring and alerting for GraphQL query performance

## Localization Service

- [ ] **Create Translation Storage:** Create a system for storing translations for UI text
- [ ] **Implement Language Selection:** Implement a feature for users to select their preferred language
- [ ] **Add French Translations:** Add French translations for all UI text
- [ ] **Add Spanish Translations:** Add Spanish translations for all UI text
- [ ] **Create Community Translation Process:** Create a process for community contributions to translations
- [ ] **Implement RTL Support:** Ensure the UI is right-to-left (RTL) compatible for appropriate languages

## Media Storage Service

- [ ] **Upload Photo:** Create an API endpoint for users to upload a photo
- [ ] **Upload Video:** Create an API endpoint for users to upload a video
- [ ] **Read Media:** Create an API endpoint for users to view their media
- [ ] **Add Tags:** Implement a feature for users to add tags to their media
- [ ] **Create Albums:** Implement a feature for users to create albums for their media
- [ ] **Compress Images:** Implement a service to compress uploaded images
- [ ] **Transcode Videos:** Implement a service to transcode uploaded videos
- [ ] **Set up CDN:** Set up a CDN for serving media files
- [ ] **Secure Media:** Ensure all media is stored securely with access control

## Notification Service

- [ ] **Send Email Notifications:** Implement a service to send email notifications
- [ ] **Send Push Notifications:** Implement a service to send push notifications
- [ ] **Send In-App Notifications:** Implement a service to send in-app notifications
- [ ] **Read Preferences:** Create an API endpoint for users to view their notification preferences
- [ ] **Update Preferences:** Create an API endpoint for users to update their notification preferences
- [ ] **Schedule Marketing Emails:** Create a system for scheduling and sending marketing emails
- [ ] **Track Email Open Rates:** Implement tracking for email open rates
- [ ] **Track Email Click-Through Rates:** Implement tracking for email click-through rates
- [ ] **Ensure Opt-In:** Ensure all notifications are opt-in and easy to unsubscribe from

## Relationship Verification Service

- [ ] **Request Verification:** Create an API endpoint for users to request relationship verification
- [ ] **Approve Verification:** Create an API endpoint for users to approve a relationship verification request
- [ ] **Reject Verification:** Create an API endpoint for users to reject a relationship verification request
- [ ] **Upload Birth Certificate:** Allow users to upload a birth certificate as evidence
- [ ] **Upload Marriage License:** Allow users to upload a marriage license as evidence
- [ ] **Create Verification UI:** Create a UI for users to view and manage their verification requests
- [ ] **Secure Evidence:** Ensure all evidence is stored securely and is only accessible to authorized users

## Search Discovery Service

- [ ] **Search People:** Implement a search API for finding people by name
- [ ] **Search Places:** Implement a search API for finding places by name
- [ ] **Search Events:** Implement a search API for finding events by name
- [ ] **Filter by Date:** Add a filter to the search API for date ranges
- [ ] **Filter by Location:** Add a filter to the search API for location
- [ ] **Implement Search Suggestions:** Implement a feature to provide search suggestions as the user types
- [ ] **Recommend People:** Implement a feature to recommend new people to the user
- [ ] **Recommend Places:** Implement a feature to recommend new places to the user
- [ ] **Optimize Search Performance:** Optimize search query performance
- [ ] **Log Search Queries:** Log all search queries for analysis

## Trust Access Control Service

- [ ] **Create Permission Schema:** Create a database schema for user data access permissions
- [ ] **Grant Access:** Create an API endpoint for users to grant access to their data
- [ ] **Revoke Access:** Create an API endpoint for users to revoke access to their data
- [ ] **Implement Trust Levels:** Implement different levels of trust (e.g., view-only, edit)
- [ ] **Create Privacy Settings UI:** Create a UI for users to manage their privacy settings
- [ ] **Create Access UI:** Create a UI for users to see who has access to their data
- [ ] **Secure Access Control:** Ensure the access control system is secure and reliable
- [ ] **Audit Access Control:** Implement a process for regularly auditing access control policies
