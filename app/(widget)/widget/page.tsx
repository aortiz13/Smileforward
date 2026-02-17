import WidgetContainer from "@/components/widget/WidgetContainer";
import { Card } from "@/components/ui/card";

export default function WidgetPage() {
    return (
        <Card className="relative border border-zinc-100 dark:border-zinc-800 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden bg-white dark:bg-zinc-900 rounded-[2rem]">
            <div className="p-0">
                <WidgetContainer />
            </div>
        </Card>
    );
}
