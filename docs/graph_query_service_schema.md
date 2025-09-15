# Graph Query Service: GraphQL Schema Documentation

## Overview

This document describes the GraphQL schema for the Graph Query Service, which provides access to family tree data.

## Root Query Type

```graphql
type Query {
  familyTree(id: ID!): FamilyTree
  familyTrees(userId: ID!): [FamilyTree]
  person(id: ID!): Person
  searchPeople(query: String!): [Person]
  relationship(id: ID!): Relationship
}
```

## Types

```graphql
type FamilyTree {
  id: ID!
  name: String!
  owner: User!
  members: [Person!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Person {
  id: ID!
  firstName: String!
  lastName: String!
  birthDate: Date
  deathDate: Date
  gender: Gender
  relationships: [Relationship!]!
  customFields: JSON
}

type Relationship {
  id: ID!
  type: RelationshipType!
  person1: Person!
  person2: Person!
  startDate: Date
  endDate: Date
  notes: String
}

type User {
  id: ID!
  email: String!
  displayName: String!
}

scalar Date
scalar DateTime
scalar JSON
enum Gender {
  MALE
  FEMALE
  OTHER
}
enum RelationshipType {
  PARENT_CHILD
  SPOUSE
  SIBLING
  STEP_PARENT
  STEP_CHILD
  ADOPTIVE
}
```

## Mutations

```graphql
type Mutation {
  createFamilyTree(name: String!): FamilyTree
  addPerson(treeId: ID!, input: PersonInput!): Person
  updatePerson(id: ID!, input: PersonInput!): Person
  deletePerson(id: ID!): Boolean
  addRelationship(input: RelationshipInput!): Relationship
  updateRelationship(id: ID!, input: RelationshipInput!): Relationship
  deleteRelationship(id: ID!): Boolean
}
```

## Inputs

```graphql
input PersonInput {
  firstName: String!
  lastName: String!
  birthDate: Date
  deathDate: Date
  gender: Gender
  customFields: JSON
}

input RelationshipInput {
  type: RelationshipType!
  person1: ID!
  person2: ID!
  startDate: Date
  endDate: Date
  notes: String
}
```

## Custom Scalars

- **Date**: ISO 8601 date string (YYYY-MM-DD)
- **DateTime**: ISO 8601 datetime string (YYYY-MM-DDTHH:MM:SSZ)
- **JSON**: Arbitrary JSON object

## Versioning

The schema supports versioning via the `X-GraphQL-Schema-Version` header.
