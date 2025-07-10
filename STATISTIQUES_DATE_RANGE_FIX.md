# Correction du problème des dates du graphique "Parties dans le temps"

## Problème identifié
Dans l'interface d'administration, section Statistiques, lorsque l'utilisateur changeait la période d'affichage (7j/30j/90j/toute la période), les dates du graphique "Parties dans le temps" ne se mettaient pas à jour et affichaient toujours les 7 derniers jours.

## Cause du problème
Le backend générait systématiquement un array de 7 dates (les 7 derniers jours) peu importe la période sélectionnée par l'utilisateur. Le code problématique était :

```typescript
// Generate dates for the last 7 days
const dates = Array.from({ length: 7 }).map((_, i) => {
  const date = subDays(new Date(), 6 - i);
  return format(date, 'yyyy-MM-dd');
});
```

## Solution implementée

### 1. Génération dynamique des dates
Création d'une fonction `generateDatesForPeriod` qui génère les dates appropriées selon la période sélectionnée :

```typescript
const generateDatesForPeriod = (from: Date, to: Date) => {
  const dates = [];
  const current = new Date(from);
  const end = new Date(to);
  
  // Calculate the number of days
  const diffTime = Math.abs(end.getTime() - from.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // For periods longer than 90 days, group by weeks
  if (diffDays > 90) {
    // Group by weeks for very long periods
    const startOfWeek = new Date(from);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    
    const currentWeek = new Date(startOfWeek);
    while (currentWeek <= end) {
      dates.push(format(currentWeek, 'yyyy-MM-dd'));
      currentWeek.setDate(currentWeek.getDate() + 7);
    }
  } else {
    // Daily granularity for shorter periods
    while (current <= end) {
      dates.push(format(current, 'yyyy-MM-dd'));
      current.setDate(current.getDate() + 1);
    }
  }
  
  return dates;
};
```

### 2. Regroupement intelligent des données
Création d'une fonction `groupDataByDateRange` qui regroupe les données selon le type de période :

```typescript
const groupDataByDateRange = (data: any[], dates: string[], isWeeklyGrouping: boolean) => {
  const grouped = dates.map(date => ({ date, count: 0 }));
  
  data.forEach(item => {
    const itemDate = new Date(item.createdAt);
    
    if (isWeeklyGrouping) {
      // For weekly grouping, find the week that contains this date
      const itemWeekStart = new Date(itemDate);
      itemWeekStart.setDate(itemWeekStart.getDate() - itemWeekStart.getDay());
      const weekStr = format(itemWeekStart, 'yyyy-MM-dd');
      
      const weekIndex = grouped.findIndex(g => g.date === weekStr);
      if (weekIndex >= 0) {
        grouped[weekIndex].count++;
      }
    } else {
      // For daily grouping, match exact date
      const dateStr = format(itemDate, 'yyyy-MM-dd');
      const dayIndex = grouped.findIndex(g => g.date === dateStr);
      if (dayIndex >= 0) {
        grouped[dayIndex].count++;
      }
    }
  });
  
  return grouped;
};
```

### 3. Optimisation des performances
- Pour les périodes ≤ 90 jours : regroupement par jour
- Pour les périodes > 90 jours : regroupement par semaine pour éviter trop de points de données

## Fichiers modifiés
- `apps/api/src/controllers/company.controller.ts` : Fonction `getCompanyStatistics`

## Résultat attendu
✅ Les dates du graphique "Parties dans le temps" changent maintenant correctement selon la période sélectionnée
✅ Les données affichées correspondent à la période choisie (7j/30j/90j/toute la période)
✅ Performance optimisée pour les longues périodes avec regroupement par semaine
✅ Les données de parties et de prix sont correctement regroupées selon la période

## Test recommandé
1. Aller dans Admin → Statistiques
2. Changer la période d'affichage (7j → 30j → 90j → toute la période)
3. Vérifier que les dates de l'axe X du graphique "Parties dans le temps" changent correctement
4. Vérifier que les données affichées correspondent à la période sélectionnée