# Period Tracker Implementation Guide (Flo/Clue Inspired)

Welcome, Junior Dev! You are tasked with implementing a world-class period tracker. To do this right, we need to move beyond simple "start/end date" logging and build a predictive engine that understands the female biological cycle.

## 🧬 Understanding the Cycle
A complete tracker doesn't just record history; it predicts the future. Most trackers base calculations on the **Standard Days Method**, but we want to be more precise.

### 1. Key Phases to Track
- **Menstruation**: The bleeding phase (Days 1-5 typical).
- **Follicular Phase**: From Day 1 until ovulation.
- **Ovulation**: The release of the egg. This is a *window*, typically 12-24 hours, but the "fertile window" is ~6 days.
- **Luteal Phase**: Post-ovulation until the next period. This is usually very stable (12-16 days).

## 🏗 Architectural Blueprint

### 1. Database Schema
We need a normalized schema to handle history, predictions, and symptoms.
- `period_cycles`: Stores summary data for each cycle (start_date, end_date, predicted_ovulation).
- `tracker_logs`: Daily logs for symptoms, flow intensity, mood, and sexual activity.
- `user_settings`: Base cycle length and period length (used for initial predictions).

### 2. The Predictive Engine (The "Secret Sauce")
Don't just add 28 days.
- **Average calculations**: Average the last 3-6 cycles to predict the next one.
- **Luteal Phase Stability**: If a user logs ovulation (e.g., via LH test), predict the next period by adding their average luteal phase (default 14 days).
- **Fertile Window**: Ovulation Day - 5 days + Ovulation Day.

## 🚀 Feature Roadmap

| Feature | Description | Importance |
|---------|-------------|------------|
| **Flow Tracking** | Light, Medium, Heavy, Spotting. | MUST |
| **Symptom Logging** | Cramps, Headache, Acne, Bloating. | HIGH |
| **Ovulation Prediction** | Based on cycle history and optional tests. | HIGH |
| **Pregnancy Mode** | Switches UI to track weeks of gestation instead. | MEDIUM |
| **Partner Sync** | Share cycle status with a partner (Read-only). | LOW |

## 📚 Resources for Research
1. **The Billings Ovulation Method**: Understanding cervical mucus as a fertility indicator.
2. **Symptothermal Method**: Combining Basal Body Temperature (BBT) and cervical mucus.
3. **FDA Guidance on Fertility Apps**: Critical for understanding the "not a contraceptive" disclaimer requirements.

---
*Created by Senior Engineer Antigravity*
