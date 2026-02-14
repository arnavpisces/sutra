import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { FuzzySelect, FuzzySelectItem } from '../common/FuzzySelect.js';
import { JiraClient } from '../../api/jira-client.js';
import { te } from '../../theme/te.js';

interface CreateTicketProps {
    client: JiraClient;
    onCancel: () => void;
    onCreated: (issueKey: string) => void;
}

type Step = 'project' | 'type' | 'summary' | 'description' | 'creating';

export function CreateTicket({ client, onCancel, onCreated }: CreateTicketProps) {
    const [step, setStep] = useState<Step>('project');
    const [projects, setProjects] = useState<FuzzySelectItem[]>([]);
    const [selectedProject, setSelectedProject] = useState<any>(null);

    const [issueTypes, setIssueTypes] = useState<FuzzySelectItem[]>([]);
    const [selectedType, setSelectedType] = useState<any>(null);

    const [summary, setSummary] = useState('');
    const [description, setDescription] = useState('');

    const [error, setError] = useState<string | null>(null);

    // Fetch initial projects
    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const projs = await client.searchProjects('');
                setProjects(projs.map(p => ({
                    label: `${p.name} (${p.key})`,
                    value: p.key,
                    key: p.id
                })));
            } catch (err) {
                // Ignore error on initial fetch
            }
        };
        fetchInitial();
    }, [client]);

    const handleProjectSearch = async (query: string): Promise<FuzzySelectItem[]> => {
        const projs = await client.searchProjects(query);
        return projs.map(p => ({
            label: `${p.name} (${p.key})`,
            value: p.key,
            key: p.id
        }));
    };

    // Fetch issue types when project selected
    useEffect(() => {
        if (selectedProject) {
            const fetchTypes = async () => {
                try {
                    const types = await client.getCreateMeta(selectedProject);
                    setIssueTypes(types.map(t => ({
                        label: t.name,
                        value: t.id,
                        key: t.id
                    })));
                } catch (err) {
                    setError('Failed to load issue types');
                }
            };
            fetchTypes();
        }
    }, [selectedProject, client]);

    const handleCreate = async () => {
        setStep('creating');
        try {
            const issue = await client.createIssue(selectedProject, selectedType, summary, description);
            onCreated(issue.key);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Creation failed');
            setStep('description'); // Go back to fix?
        }
    };

    useInput((input, key) => {
        if (key.escape) {
            if (step === 'project') onCancel();
            if (step === 'type') setStep('project');
            if (step === 'summary') setStep('type');
            if (step === 'description') setStep('summary');
        }
    });

    if (step === 'project') {
        return (
            <Box flexDirection="column">
                <Text bold color={te.accentAlt}>Create Ticket: Select Project</Text>
                <FuzzySelect
                    label="Project"
                    items={projects}
                    onSearch={handleProjectSearch}
                    onSelect={(val) => {
                        setSelectedProject(val);
                        setStep('type');
                    }}
                    onBack={onCancel}
                    placeholder="Select project..."
                />
                {error && <Text color="red">{error}</Text>}
            </Box>
        );
    }

    if (step === 'type') {
        return (
            <Box flexDirection="column">
                <Text bold color={te.accentAlt}>Create Ticket: Select Issue Type</Text>
                <FuzzySelect
                    label="Issue Type"
                    items={issueTypes}
                    onSelect={(val) => {
                        setSelectedType(val);
                        setStep('summary');
                    }}
                    onBack={() => setStep('project')}
                    placeholder="Select type..."
                />
                {error && <Text color="red">{error}</Text>}
            </Box>
        );
    }

    if (step === 'summary') {
        return (
            <Box flexDirection="column">
                <Text bold color={te.accentAlt}>Create Ticket: Summary</Text>
                <Box borderStyle="round" borderColor={te.accent} paddingX={1}>
                    <TextInput
                        value={summary}
                        onChange={setSummary}
                        onSubmit={() => {
                            if (summary.trim()) setStep('description');
                        }}
                        placeholder="Enter summary..."
                    />
                </Box>
                <Box marginTop={1}>
                    <Text dimColor>Enter: Next | Escape: Back</Text>
                </Box>
            </Box>
        );
    }

    if (step === 'description') {
        return (
            <Box flexDirection="column">
                <Text bold color={te.accentAlt}>Create Ticket: Description</Text>
                <Box borderStyle="round" borderColor={te.accent} paddingX={1}>
                    <TextInput
                        value={description}
                        onChange={setDescription}
                        onSubmit={handleCreate}
                        placeholder="Enter description..."
                    />
                </Box>
                <Box marginTop={1}>
                    <Text dimColor>Enter: Create | Escape: Back</Text>
                </Box>
                {error && <Text color="red">{error}</Text>}
            </Box>
        );
    }

    return (
        <Box>
            <Text>Creating ticket...</Text>
        </Box>
    );
}
