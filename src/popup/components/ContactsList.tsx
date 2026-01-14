import React, { useState } from 'react';
import type { Contact } from '../../shared/types';

interface ContactsListProps {
    contacts: Contact[];
    onDelete: (id: string) => void;
}

const ContactsList: React.FC<ContactsListProps> = ({ contacts, onDelete }) => {
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    if (contacts.length === 0) {
        return (
            <div className="empty-state">
                <svg className="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h3 className="empty-state-title">No contacts yet</h3>
                <p className="empty-state-text">Navigate to Attio's People view and click "Extract Now"</p>
            </div>
        );
    }

    const handleDelete = (id: string) => {
        if (deleteConfirm === id) {
            onDelete(id);
            setDeleteConfirm(null);
        } else {
            setDeleteConfirm(id);
            // Reset after 3 seconds
            setTimeout(() => setDeleteConfirm(null), 3000);
        }
    };

    return (
        <div className="space-y-2 pt-3">
            {contacts.map((contact, index) => (
                <div
                    key={contact.id}
                    className="card group animate-fadeIn"
                    style={{ animationDelay: `${index * 50}ms` }}
                >
                    <div className="flex items-start justify-between gap-3">
                        {/* Avatar & Info */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                                {contact.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-medium text-white truncate">{contact.name}</h3>
                                {contact.emails.length > 0 && (
                                    <p className="text-sm text-slate-400 truncate">
                                        {contact.emails[0]}
                                        {contact.emails.length > 1 && (
                                            <span className="text-slate-500"> +{contact.emails.length - 1}</span>
                                        )}
                                    </p>
                                )}
                                {contact.phones.length > 0 && (
                                    <p className="text-xs text-slate-500 truncate mt-0.5">
                                        📞 {contact.phones[0]}
                                        {contact.phones.length > 1 && ` +${contact.phones.length - 1}`}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Delete Button */}
                        <button
                            onClick={() => handleDelete(contact.id)}
                            className={`btn-danger opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ${deleteConfirm === contact.id ? 'opacity-100 !bg-red-500/30' : ''
                                }`}
                            title={deleteConfirm === contact.id ? 'Click again to confirm' : 'Delete'}
                        >
                            {deleteConfirm === contact.id ? (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ContactsList;
