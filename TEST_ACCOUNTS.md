# Test Accounts for InnTouch

**Base Email**: `inntouch.co@gmail.com`

All emails use Gmail aliases - they all go to your main inbox: `inntouch.co@gmail.com`

---

## 👑 Admin Users

### Super Admin
| Name | Email | Role | Purpose |
|------|-------|------|---------|
| Super Admin | `inntouch.co+superadmin@gmail.com` | super_admin | Full system access, can create all users |

### Hotel Admins
| Name | Email | Role | Purpose |
|------|-------|------|---------|
| Hotel Admin 1 | `inntouch.co+hoteladmin1@gmail.com` | hotel_admin | Hotel management, can create staff |
| Hotel Admin 2 | `inntouch.co+hoteladmin2@gmail.com` | hotel_admin | Second hotel admin for testing |
| Hotel Admin 3 | `inntouch.co+hoteladmin3@gmail.com` | hotel_admin | Third hotel admin for multi-hotel testing |

---

## 👥 Staff Members

### Front Desk Staff
| Name | Email | Role | Purpose |
|------|-------|------|---------|
| Front Desk 1 | `inntouch.co+frontdesk1@gmail.com` | front_desk | Handle bookings, guest services |
| Front Desk 2 | `inntouch.co+frontdesk2@gmail.com` | front_desk | Second front desk staff |
| Front Desk Manager | `inntouch.co+frontdeskmgr@gmail.com` | front_desk | Front desk supervisor |

### Housekeeping Staff
| Name | Email | Role | Purpose |
|------|-------|------|---------|
| Housekeeping 1 | `inntouch.co+housekeeping1@gmail.com` | housekeeping | Room cleaning, maintenance |
| Housekeeping 2 | `inntouch.co+housekeeping2@gmail.com` | housekeeping | Second housekeeping staff |
| Housekeeping Lead | `inntouch.co+housekeepinglead@gmail.com` | housekeeping | Housekeeping supervisor |

### Maintenance Staff
| Name | Email | Role | Purpose |
|------|-------|------|---------|
| Maintenance 1 | `inntouch.co+maintenance1@gmail.com` | maintenance | Facility maintenance, repairs |
| Maintenance 2 | `inntouch.co+maintenance2@gmail.com` | maintenance | Second maintenance staff |
| Maintenance Tech | `inntouch.co+maintenancetech@gmail.com` | maintenance | Maintenance technician |

### General Staff
| Name | Email | Role | Purpose |
|------|-------|------|---------|
| Staff 1 | `inntouch.co+staff1@gmail.com` | staff | Basic staff member |
| Staff 2 | `inntouch.co+staff2@gmail.com` | staff | Second staff member |
| Staff 3 | `inntouch.co+staff3@gmail.com` | staff | Third staff member |

---

## 🧪 Test Users

### Service Request Testing
| Name | Email | Role | Purpose |
|------|-------|------|---------|
| Test Service Request | `inntouch.co+testservicereq@gmail.com` | staff | Testing service request creation |
| Test Assign Staff | `inntouch.co+testassign@gmail.com` | staff | Testing staff assignment |

### Multi-Hotel Testing
| Name | Email | Role | Purpose |
|------|-------|------|---------|
| Multi Hotel User | `inntouch.co+multihotel@gmail.com` | hotel_admin | User assigned to multiple hotels |
| Single Hotel User | `inntouch.co+singlehotel@gmail.com` | hotel_admin | User assigned to one hotel only |

### Permission Testing
| Name | Email | Role | Purpose |
|------|-------|------|---------|
| Limited Access | `inntouch.co+limited@gmail.com` | staff | Testing restricted permissions |
| Full Access | `inntouch.co+fullaccess@gmail.com` | super_admin | Testing full permissions |

---

## 📋 Quick Reference List

### Copy-Paste Ready Emails:

```
inntouch.co+superadmin@gmail.com
inntouch.co+hoteladmin1@gmail.com
inntouch.co+hoteladmin2@gmail.com
inntouch.co+hoteladmin3@gmail.com
inntouch.co+frontdesk1@gmail.com
inntouch.co+frontdesk2@gmail.com
inntouch.co+frontdeskmgr@gmail.com
inntouch.co+housekeeping1@gmail.com
inntouch.co+housekeeping2@gmail.com
inntouch.co+housekeepinglead@gmail.com
inntouch.co+maintenance1@gmail.com
inntouch.co+maintenance2@gmail.com
inntouch.co+maintenancetech@gmail.com
inntouch.co+staff1@gmail.com
inntouch.co+staff2@gmail.com
inntouch.co+staff3@gmail.com
inntouch.co+testservicereq@gmail.com
inntouch.co+testassign@gmail.com
inntouch.co+multihotel@gmail.com
inntouch.co+singlehotel@gmail.com
inntouch.co+limited@gmail.com
inntouch.co+fullaccess@gmail.com
```

---

## 🎯 Recommended Test Scenarios

### Scenario 1: Basic Staff Assignment
- **Create**: `inntouch.co+staff1@gmail.com` (staff role)
- **Assign to**: Hotel 1
- **Test**: Create service request, assign to this staff

### Scenario 2: Multi-Role Testing
- **Create**: `inntouch.co+frontdesk1@gmail.com` (front_desk)
- **Create**: `inntouch.co+housekeeping1@gmail.com` (housekeeping)
- **Create**: `inntouch.co+maintenance1@gmail.com` (maintenance)
- **Test**: Each role has different permissions

### Scenario 3: Hotel Admin Testing
- **Create**: `inntouch.co+hoteladmin1@gmail.com` (hotel_admin)
- **Assign to**: Hotel 1
- **Test**: Can create staff, manage hotel settings

### Scenario 4: Service Request Flow
- **Create**: `inntouch.co+frontdesk1@gmail.com`
- **Create**: `inntouch.co+housekeeping1@gmail.com`
- **Test**: Create request → Assign to staff → Complete

---

## 📝 Usage Instructions

### When Creating Users in Your App:

1. **Go to**: Users → New User or Staff → New Staff
2. **Enter Name**: e.g., "Front Desk 1"
3. **Enter Email**: `inntouch.co+frontdesk1@gmail.com`
4. **Select Role**: Choose appropriate role
5. **Assign Hotels**: Select hotels for this user
6. **Create**: The invitation email will be sent to `inntouch.co@gmail.com`

### All Invitation Emails Will Go To:
📧 **inntouch.co@gmail.com**

You'll receive all test user invitation emails in one inbox!

---

## 🔍 Email Organization Tips

### Create Gmail Filters:

1. **Filter for Staff**: `inntouch.co+staff*@gmail.com` → Label: "Staff Users"
2. **Filter for Admins**: `inntouch.co+*admin*@gmail.com` → Label: "Admin Users"
3. **Filter for Test**: `inntouch.co+test*@gmail.com` → Label: "Test Users"

This way, all test emails are organized automatically!

---

## ✅ Checklist

Use this checklist when setting up test accounts:

### Admin Users:
- [ ] Super Admin (`inntouch.co+superadmin@gmail.com`)
- [ ] Hotel Admin 1 (`inntouch.co+hoteladmin1@gmail.com`)
- [ ] Hotel Admin 2 (`inntouch.co+hoteladmin2@gmail.com`)

### Front Desk:
- [ ] Front Desk 1 (`inntouch.co+frontdesk1@gmail.com`)
- [ ] Front Desk 2 (`inntouch.co+frontdesk2@gmail.com`)

### Housekeeping:
- [ ] Housekeeping 1 (`inntouch.co+housekeeping1@gmail.com`)
- [ ] Housekeeping 2 (`inntouch.co+housekeeping2@gmail.com`)

### Maintenance:
- [ ] Maintenance 1 (`inntouch.co+maintenance1@gmail.com`)
- [ ] Maintenance 2 (`inntouch.co+maintenance2@gmail.com`)

### General Staff:
- [ ] Staff 1 (`inntouch.co+staff1@gmail.com`)
- [ ] Staff 2 (`inntouch.co+staff2@gmail.com`)

### Test Users:
- [ ] Test Service Request (`inntouch.co+testservicereq@gmail.com`)
- [ ] Test Assign (`inntouch.co+testassign@gmail.com`)

---

## 💡 Tips

1. **Start with essential accounts**: Create super admin and hotel admin first
2. **Create staff as needed**: Don't create all at once, create as you test features
3. **Use descriptive aliases**: Makes it easy to identify which email is for which role
4. **Check your inbox**: All emails go to `inntouch.co@gmail.com`
5. **Save passwords**: The system generates passwords - save them securely if needed

---

**Total Test Accounts**: 22 accounts ready to create!

All emails will deliver to: **inntouch.co@gmail.com** 📬

