# Graph Query Service: API Documentation

## Overview

The Graph Query Service exposes a GraphQL API for querying and mutating family tree data.

## Endpoint

- **URL:** `/graphql`
- **Method:** `POST`
- **Content-Type:** `application/json`
- **Authentication:** JWT Bearer token required in `Authorization` header

## Request Format

Send a POST request with the following JSON body:

```json
{
  "query": "query { familyTree(id: \"123\") { id name members { id firstName lastName } } }",
  "variables": {}
}
```

## Headers

- `Authorization: Bearer <JWT>`
- `X-GraphQL-Schema-Version: <version>` (optional)

## Example Queries

### Get a Family Tree

```graphql
query {
  familyTree(id: "123") {
    id
    name
    members {
      id
      firstName
      lastName
    }
  }
}
```

### Search People

```graphql
query {
  searchPeople(query: "Smith") {
    id
    firstName
    lastName
    birthDate
  }
}
```

### Add a Person

```graphql
mutation {
  addPerson(
    treeId: "123"
    input: { firstName: "John", lastName: "Smith", birthDate: "1980-01-01" }
  ) {
    id
    firstName
    lastName
  }
}
```

## Error Handling

Errors are returned in the standard GraphQL error format:

```json
{
  "errors": [
    {
      "message": "Not authorized",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["familyTree"]
    }
  ],
  "data": null
}
```

## Playground

An interactive GraphQL Playground is available at `/graphql/playground`.

## Versioning

Specify the schema version using the `X-GraphQL-Schema-Version` header.
