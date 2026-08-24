# Permission System Documentation

## Overview

The ASTU Stock Management System uses a role-based access control (RBAC) system where:
- **Roles** are assigned to users (e.g., Administrator, Storekeeper)
- **Permissions** are assigned to roles (e.g., `inventory.create`, `users.read`)
- Users inherit all permissions from their assigned roles
- Administrators bypass all permission checks (full access)

## Roles

| Role | Code | Description |
|------|------|-------------|
| Administrator | `ADMINISTRATOR` | Full system access, bypasses all permission checks |
| Property Admin Officer | `PAO` | Manages property and inventory operations |
| Storekeeper | `STOREKEEPER` | Manages stock receipts, issues, and store operations |
| Stock Clerk | `STOCK_CLERK` | Basic stock operations and data entry |
| Accountant | `ACCOUNTANT` | Financial reporting and audit access |
| Department Head | `DEPARTMENT_HEAD` | Requisition approval and department reporting |
| Security Officer | `SECURITY_OFFICER` | Gate pass management and security checks |
| Supplier | `SUPPLIER` | Limited access to view orders and deliveries |

## Permissions

### User Management
| Permission | Description | Routes |
|------------|-------------|--------|
| `users.read` | View users | GET `/api/v1/users`, GET `/api/v1/users/:id` |
| `users.create` | Create users | POST `/api/v1/users` |
| `users.update` | Update users | PATCH `/api/v1/users/:id` |
| `users.delete` | Delete users | DELETE `/api/v1/users/:id` |

### Inventory Management
| Permission | Description | Routes |
|------------|-------------|--------|
| `inventory.read` | View inventory items | GET `/api/v1/inventory`, GET `/api/v1/inventory/:id` |
| `inventory.create` | Create items | POST `/api/v1/inventory` |
| `inventory.update` | Update items | PATCH `/api/v1/inventory/:id` |
| `inventory.delete` | Delete items | DELETE `/api/v1/inventory/:id` |

### Stock Operations
| Permission | Description | Routes |
|------------|-------------|--------|
| `stock.receive` | Receive stock | POST `/api/v1/receipts` |
| `stock.issue` | Issue stock | POST `/api/v1/issues` |
| `stock.transfer` | Transfer stock | POST `/api/v1/transfers` |
| `stock.adjust` | Adjust stock | POST `/api/v1/adjustments` |

### Requisitions
| Permission | Description | Routes |
|------------|-------------|--------|
| `requisitions.read` | View requisitions | GET `/api/v1/requisitions` |
| `requisitions.create` | Create requisitions | POST `/api/v1/requisitions` |
| `requisitions.approve` | Approve requisitions | PATCH `/api/v1/requisitions/:id/approve` |
| `requisitions.reject` | Reject requisitions | PATCH `/api/v1/requisitions/:id/reject` |

### Settings
| Permission | Description | Routes |
|------------|-------------|--------|
| `categories.read` | View categories | GET `/api/v1/inventory/categories` |
| `categories.create` | Create categories | POST `/api/v1/inventory/categories` |
| `warehouses.read` | View stores/warehouses | GET `/api/v1/inventory/stores` |
| `warehouses.create` | Create stores | POST `/api/v1/inventory/stores` |
| `suppliers.read` | View suppliers | GET `/api/v1/suppliers` |
| `suppliers.create` | Create suppliers | POST `/api/v1/suppliers` |

### Reports & Audit
| Permission | Description | Routes |
|------------|-------------|--------|
| `reports.read` | View reports | GET `/api/v1/reports/*` |
| `reports.export` | Export reports | GET `/api/v1/reports/*/export` |
| `audit.read` | View audit logs | GET `/api/v1/audit-logs` |

## Permission Matrix

| Permission | Admin | PAO | Storekeeper | Clerk | Accountant | Dept Head | Security | Supplier |
|------------|-------|-----|-------------|-------|------------|-----------|----------|----------|
| **Users** |
| users.read | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| users.create | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| users.update | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| users.delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Inventory** |
| inventory.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| inventory.create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| inventory.update | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| inventory.delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Stock Operations** |
| stock.receive | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| stock.issue | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| stock.transfer | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Requisitions** |
| requisitions.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| requisitions.create | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| requisitions.approve | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Reports** |
| reports.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| reports.export | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| audit.read | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |

## Usage Examples

### In Route Files

```typescript
import { Router } from "express";
import { requirePermission, requireAnyPermission } from "../middleware/auth";

const router = Router();

// Single permission required
router.post("/items", 
  requirePermission("inventory.create"), 
  async (req, res) => {
    // Only users with inventory.create permission can access
  }
);

// Any of multiple permissions (OR logic)
router.get("/receipts", 
  requireAnyPermission("inventory.read", "stock.receive"), 
  async (req, res) => {
    // Users with either permission can access
  }
);

// Multiple permissions required (use requirePermission with multiple args)
router.post("/receipts/:id/approve", 
  requirePermission("stock.receive", "inventory.update"), 
  async (req, res) => {
    // Users must have BOTH permissions
  }
);
```

### In Service/Controller Files

```typescript
import { AuthedRequest } from "../middleware/auth";

export async function someFunction(req: AuthedRequest) {
  // Check role
  if (req.roles.has("ADMINISTRATOR")) {
    // Admin-specific logic
  }
  
  // Check permission
  if (req.permissions.has("inventory.delete")) {
    // User has delete permission
  }
  
  // Get user ID
  const userId = req.userId;
}
```

## Testing Permissions

### Test Unauthorized Access (401)
```bash
# Request without token
curl -X POST http://localhost:5000/api/v1/inventory \
  -H "Content-Type: application/json" \
  -d '{"code":"TEST001","name":"Test Item"}'
# Expected: 401 Unauthorized
```

### Test Forbidden Access (403)
```bash
# Login as user with limited permissions
TOKEN=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"clerk@sms.et","password":"Password@123"}' \
  | jq -r '.data.token')

# Try to delete item (clerks don't have delete permission)
curl -X DELETE http://localhost:5000/api/v1/inventory/ITEM_ID \
  -H "Authorization: Bearer $TOKEN"
# Expected: 403 Forbidden
```

### Test Authorized Access (200)
```bash
# Login as admin
ADMIN_TOKEN=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sms.et","password":"Password@123"}' \
  | jq -r '.data.token')

# Delete item (admin has all permissions)
curl -X DELETE http://localhost:5000/api/v1/inventory/ITEM_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: 200 OK
```

## Adding New Permissions

1. **Add to constants** (if not using database-driven permissions):
   ```typescript
   // backend/src/constants/permissions.ts
   export const PERMISSIONS = {
     // ... existing
     NEW_PERMISSION: "NEW_PERMISSION",
   };
   ```

2. **Assign to roles** (in database or seed file):
   ```typescript
   // backend/prisma/seed.ts
   await prisma.rolePermission.create({
     data: {
       roleId: storekeeperRole.id,
       permissionId: newPermission.id,
     }
   });
   ```

3. **Use in routes**:
   ```typescript
   router.post("/new-endpoint", 
     requirePermission("NEW_PERMISSION"), 
     handler
   );
   ```

## Security Best Practices

1. **Always use permission checks** - Never rely on authentication alone
2. **Principle of least privilege** - Give minimum permissions needed
3. **Administrators bypass checks** - Be careful with admin assignments
4. **Test with different roles** - Ensure each role has correct access
5. **Audit permission changes** - Log when permissions are granted/revoked
6. **Review regularly** - Permissions should match job responsibilities

## Troubleshooting

### "Permission denied" errors
1. Check if user is logged in (`req.userId` exists)
2. Check if user has required role/permission
3. Verify permission name matches exactly (case-sensitive)
4. Check if route middleware is in correct order

### Permission not working
1. Ensure user's roles have the permission assigned
2. Check database: `SELECT * FROM role_permissions WHERE roleId = 'xxx'`
3. Verify permission middleware is before route handler
4. Check for typos in permission strings

## Related Files

- `backend/src/middleware/auth.ts` - Authentication & authorization middleware
- `backend/src/constants/permissions.ts` - Permission constants
- `backend/src/constants/roles.ts` - Role constants
- `backend/prisma/seed.ts` - Default roles and permissions setup
