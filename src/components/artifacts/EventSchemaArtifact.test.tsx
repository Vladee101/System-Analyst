import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EventSchemaArtifact } from './EventSchemaArtifact';

const specSample = {
  topic: 'order.status.changed',
  key: 'order_id (String)',
  partitions: 12,
  retention: '7 days',
  schema: {
    order_id: 'String (UUID)',
    old_status: 'String (enum)',
    new_status: 'String (enum)',
    changed_at: 'DateTime (ISO 8601)',
    changed_by: 'String (user_id | system)',
  },
};

describe('EventSchemaArtifact', () => {
  it('renders the topic name', () => {
    render(<EventSchemaArtifact data={specSample} />);
    expect(screen.getByText('order.status.changed')).toBeInTheDocument();
  });

  it('renders the Kafka Topic label', () => {
    render(<EventSchemaArtifact data={specSample} />);
    expect(screen.getByText('Kafka Topic')).toBeInTheDocument();
  });

  it('renders the key metadata', () => {
    render(<EventSchemaArtifact data={specSample} />);
    expect(screen.getByText('order_id (String)')).toBeInTheDocument();
  });

  it('renders the partitions count', () => {
    render(<EventSchemaArtifact data={specSample} />);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders the retention value', () => {
    render(<EventSchemaArtifact data={specSample} />);
    expect(screen.getByText('7 days')).toBeInTheDocument();
  });

  it('renders schema table headers', () => {
    render(<EventSchemaArtifact data={specSample} />);
    expect(screen.getByText('Поле')).toBeInTheDocument();
    expect(screen.getByText('Тип')).toBeInTheDocument();
  });

  it('renders all schema field names', () => {
    render(<EventSchemaArtifact data={specSample} />);
    expect(screen.getByText('order_id')).toBeInTheDocument();
    expect(screen.getByText('old_status')).toBeInTheDocument();
    expect(screen.getByText('new_status')).toBeInTheDocument();
    expect(screen.getByText('changed_at')).toBeInTheDocument();
    expect(screen.getByText('changed_by')).toBeInTheDocument();
  });

  it('renders all schema type values', () => {
    render(<EventSchemaArtifact data={specSample} />);
    expect(screen.getByText('String (UUID)')).toBeInTheDocument();
    expect(screen.getByText('DateTime (ISO 8601)')).toBeInTheDocument();
    expect(screen.getByText('String (user_id | system)')).toBeInTheDocument();
  });

  it('renders without optional metadata fields', () => {
    render(<EventSchemaArtifact data={{ topic: 'my.topic' }} />);
    expect(screen.getByText('my.topic')).toBeInTheDocument();
    expect(screen.queryByText('Key:')).not.toBeInTheDocument();
    expect(screen.queryByText('Partitions:')).not.toBeInTheDocument();
    expect(screen.queryByText('Retention:')).not.toBeInTheDocument();
    expect(screen.queryByText('Поле')).not.toBeInTheDocument();
  });
});
