import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Reusable statistics card component for dashboard analytics.
 * @param {Object} props
 * @param {string} props.title - The title of the stat
 * @param {string|number} props.value - The main value to display
 * @param {React.ReactNode} props.icon - The icon component to display
 * @param {string} [props.subText] - Optional sub-text below the value
 * @param {string} [props.className] - Optional additional CSS classes
 */
const StatsCard = ({ title, value, icon: Icon, subText, className }) => {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subText && (
          <p className="text-xs text-muted-foreground mt-1">
            {subText}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StatsCard;
