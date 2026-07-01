import styles from "./PlaceholderPanel.module.css";

interface PlaceholderPanelProps {
    name: string;
    description: string;
}

export function PlaceholderPanel({ name, description }: PlaceholderPanelProps) {
    return (
        <div className={styles.placeholder}>
            <p className={styles.name}>{name}</p>
            <p className={styles.description}>{description}</p>
        </div>
    );
}
