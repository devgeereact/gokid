Below is a complete UX flow and wireframe architecture for **GoKid**. This is the type of document a product team, UX designer, and developers would use before building the application.

---

# GoKid

# Complete UX Flow & Wireframe Architecture

### AI Learning App (Reception – Year 6)

**Version 1.0**

---

# APPLICATION MAP

```text
                         SPLASH
                            │
                            ▼
                  Parent Welcome / Login
                            │
                            ▼
                     Continue Apple/Google
                            │
                            ▼
                Existing Parent Account?
                   ┌─────────────┐
                   │             │
                  YES            NO
                   │             │
                   ▼             ▼
           Who's Studying?   Add Child
                   ▲             │
                   └─────────────┘
                            │
                            ▼
                   Child Profile Created
                            │
                            ▼
                    Who's Studying?
                            │
                            ▼
                  Select Child Profile
                            │
                            ▼
                         Home
```

---

# MAIN NAVIGATION

```
                 HOME
      ┌──────────┼──────────┐
      ▼          ▼          ▼
    Study     Progress    Parent
```

Bottom Navigation

```
-----------------------------------
🏠 Study   📊 Progress   🔒 Parent
-----------------------------------
```

---

# STUDY FLOW

```
Home

↓

Study Set

↓

Study Cards

↓

Quiz

↓

Quiz Results

↓

Progress Updated

↓

Next Set
```

Detailed

```
HOME
 │
 ├── Continue Learning
 │
 ├── Recommended Sets
 │
 ├── Recent Sets
 │
 └── Subject Categories
         │
         ▼
     Set Detail
         │
         ▼
   Study Cards
         │
         ▼
 ┌──────────────┐
 │ Card 1       │
 │ Card 2       │
 │ Card 3       │
 │ ...          │
 │ Card 20      │
 └──────────────┘
         │
         ▼
      Quiz
         │
         ▼
 Question 1
 Question 2
 Question 3
 ...
 Question10
         │
         ▼
   Quiz Results
         │
         ▼
 Progress Update
         │
         ▼
 Continue Learning
```

---

# FLASHCARD FLOW

```
Open Set

↓

Flashcard

↓

Tap

↓

3D Flip

↓

Reveal Answer

↓

Choose

┌────────────┬────────────┐
│            │            │
▼            ▼
Tricky     Got It
│            │
│            │
▼            ▼
Learning   Mastery+

        ↓

Next Card
```

---

# QUIZ FLOW

```
Quiz

↓

Question

↓

Select Answer

↓

Check Answer

↓

Correct?

     ┌─────────┐
     │         │
    YES        NO
     │         │
     ▼         ▼
Explanation  Explanation
     │         │
     └────┬────┘
          ▼
     Next Question

          │

       Final Score

          │

    Quiz Results
```

---

# SPACED REPETITION ENGINE

```
Flashcard Reviewed

↓

User Feedback

┌───────────────┬──────────────┐
│               │
Tricky        Got It
│               │
▼               ▼
Tomorrow     +5 Days

↓

Next Review Date

↓

Scheduler

↓

Appears Again
```

---

# CHILD EXPERIENCE

```
Who's Studying?

↓

Amara

↓

Home

↓

Study

↓

Quiz

↓

Results

↓

Progress

↓

Home
```

Child never sees:

* Subscription
* Billing
* Settings
* Passwords

---

# PARENT EXPERIENCE

```
Parent Tab

↓

Parental Gate

↓

Parent Dashboard

├── Child Profiles
├── Progress
├── Subscription
├── Account
├── AI Usage
├── Downloads
├── Settings
└── Help
```

---

# PARENT GATE

```
Parent Button

↓

Math Question

10 × 8

↓

Answer

↓

Correct?

YES

↓

Parent Dashboard

NO

↓

Stay on Child Screen
```

---

# NEW USER FLOW

```
Splash

↓

Welcome

↓

Apple / Google

↓

Create Parent

↓

Add Child

↓

Choose Year

↓

Home

↓

Suggested Set

↓

Study

↓

Quiz

↓

Results
```

---

# RETURNING USER FLOW

```
Splash

↓

Who's Studying

↓

Choose Child

↓

Continue Learning

↓

Resume Session
```

---

# OFFLINE FLOW

```
No Internet

↓

Offline Banner

↓

Downloaded Sets

↓

Study

↓

Scores Stored

↓

Internet Returns

↓

Background Sync
```

---

# SUBSCRIPTION FLOW

```
Parent

↓

Subscription

↓

Benefits

↓

Monthly / Annual

↓

Apple Pay

↓

Success

↓

Premium Activated
```

---

# EMPTY STATE FLOW

```
No Sets

↓

Illustration

↓

AI Generates

↓

Loading Skeleton

↓

Sets Ready
```

---

# PROGRESS FLOW

```
Every Card

↓

Mastery Updated

↓

Overall Progress

↓

Subject Progress

↓

Parent Dashboard

↓

AI Recommendation
```

---

# COMPLETE APP INFORMATION ARCHITECTURE

```
GoKid

├── Authentication
│   ├── Splash
│   ├── Welcome
│   ├── Apple Login
│   ├── Google Login
│   └── Add Child
│
├── Child Area
│   ├── Profile Picker
│   ├── Home
│   ├── Set Detail
│   ├── Flashcards
│   ├── Quiz
│   ├── Results
│   ├── Progress
│   ├── Offline
│   ├── Empty State
│   └── Session Complete
│
├── Parent Area
│   ├── Parent Gate
│   ├── Dashboard
│   ├── Children
│   ├── Progress
│   ├── Subscription
│   ├── Billing
│   ├── Account
│   ├── Downloads
│   ├── Notifications
│   ├── Help
│   └── Settings
│
├── AI Engine
│   ├── Curriculum
│   ├── Flashcards
│   ├── Quiz Generation
│   ├── Mastery
│   ├── Scheduling
│   └── Recommendations
│
└── Sync Engine
    ├── Offline Cache
    ├── Downloads
    ├── Upload Queue
    └── Device Sync
```

# Screen Connection Matrix

| From             | Action                     | To                          |
| ---------------- | -------------------------- | --------------------------- |
| Splash           | App loads                  | Parent Welcome              |
| Parent Welcome   | Continue with Apple/Google | Add Child or Who's Studying |
| Add Child        | Save child                 | Who's Studying              |
| Who's Studying   | Select child               | Home                        |
| Home             | Tap study set              | Set Detail                  |
| Set Detail       | Study cards                | Flashcards                  |
| Flashcards       | Complete cards             | Quiz                        |
| Quiz             | Finish quiz                | Quiz Results                |
| Quiz Results     | Continue                   | Progress Update             |
| Progress         | Tap Study                  | Home                        |
| Home             | Tap Parent                 | Parent Gate                 |
| Parent Gate      | Correct answer             | Parent Dashboard            |
| Parent Dashboard | Subscription               | Paywall                     |
| Parent Dashboard | Child                      | Child Progress              |
| Home             | Offline                    | Offline State               |
| Home             | No content                 | Empty State                 |
| Session Complete | Back Home                  | Home                        |

This structure defines the complete navigation, decision points, and relationships between every major screen in GoKid, providing a solid blueprint for UX design, frontend implementation, and backend routing.
