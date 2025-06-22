# Family Member Update Endpoint Fix

## ✅ Problem Resolved

### **Original Issue:**

When trying to edit a family member (e.g., changing sex from "unknown" to "male"), the frontend was getting:

```
Database query error: column "place_of_birth" of relation "family_members" does not exist
```

### **Root Cause:**

The frontend was calling a **non-existent UPDATE endpoint**:

- **Frontend expected**: `PUT /api/persons/{personId}`
- **Backend had**: Only `POST /api/genealogy/members` (create)
- **Missing**: `PUT /api/genealogy/members/{id}` (update)

## 🔧 Solution Implemented

### **1. Added Missing UPDATE Endpoint**

**File**: `backend-service/src/routes/genealogy.ts`

#### **New Route Added:**

```typescript
router.put("/members/:id", [...validation], async (req, res) => {
  // Full CRUD update functionality
});
```

#### **Features:**

- ✅ **Authentication**: JWT token validation
- ✅ **Authorization**: User can only update their own family members
- ✅ **Validation**: Comprehensive field validation
- ✅ **Flexible Updates**: Only updates provided fields
- ✅ **Name Computation**: Handles firstname/lastname/nickname logic
- ✅ **All Fields Supported**: All database columns included

#### **Dynamic Update Logic:**

```typescript
// Builds UPDATE query dynamically based on provided fields
const updateFields: string[] = [];
const updateValues: any[] = [];

if (firstName !== undefined) {
  updateFields.push(`first_name = $${paramCounter++}`);
  updateValues.push(firstName?.trim() || null);
}
// ... for all fields
```

### **2. Fixed Frontend Service URLs**

**File**: `frontend/src/services/api/genealogyService.ts`

#### **URL Corrections:**

- **Before**: `PUT /api/persons/{personId}` ❌
- **After**: `PUT /api/genealogy/members/{personId}` ✅

- **Before**: `POST /api/persons` ❌
- **After**: `POST /api/genealogy/members` ✅

#### **Updated Methods:**

```typescript
async updatePersonInTree(personId: string, personData: Partial<FamilyMember>) {
  const response = await apiClient.put(
    `/api/genealogy/members/${personId}`,
    personData
  );
  return response.data;
}
```

### **3. Complete CRUD Operations**

Now the API supports:

- ✅ **CREATE**: `POST /api/genealogy/members`
- ✅ **READ**: `GET /api/genealogy/family-tree`
- ✅ **UPDATE**: `PUT /api/genealogy/members/{id}` ← **NEW**
- ✅ **DELETE**: (Can be added if needed)

## 🎯 Key Features of Update Endpoint

### **Smart Field Updates:**

- **Partial Updates**: Only updates fields that are provided
- **Name Computation**: Automatically maintains computed display name
- **Null Handling**: Properly handles empty/null values
- **Validation**: Each field validated according to business rules

### **Genealogy-Friendly:**

- **Flexible Names**: Supports firstname/lastname/nickname combinations
- **Historical Data**: Handles biographical fields (places, occupation, etc.)
- **Research Notes**: Biography and notes fields for genealogy research
- **Complete Profile**: All profile fields can be updated

### **Security & Validation:**

- **User Isolation**: Users can only update their own family members
- **Input Validation**: All fields validated for type, length, format
- **SQL Injection Protection**: Parameterized queries
- **Error Handling**: Comprehensive error responses

## 🧪 Testing Scenarios

### **Basic Updates:**

✅ Change gender: "unknown" → "male"  
✅ Update birth date  
✅ Add nickname  
✅ Update profile image

### **Complex Updates:**

✅ Add biographical information  
✅ Update multiple fields at once  
✅ Handle name computation changes  
✅ Validate field constraints

### **Edge Cases:**

✅ Empty field updates (set to null)  
✅ Invalid user attempts (403 Forbidden)  
✅ Non-existent member (404 Not Found)  
✅ Validation errors (400 Bad Request)

## 🚀 Resolution Complete

The update functionality is now fully operational:

- **Backend**: Complete UPDATE endpoint with all database columns
- **Frontend**: Correct API calls to proper endpoints
- **Database**: All required columns exist and working
- **Validation**: Comprehensive field validation and error handling

Users can now successfully edit any family member field, including simple changes like updating gender from "unknown" to "male"!
