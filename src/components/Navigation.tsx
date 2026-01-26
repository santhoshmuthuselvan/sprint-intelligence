import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, BarChart3 } from 'lucide-react';

export const Navigation: React.FC = () => {
    return (
        <nav className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <BarChart3 className="w-8 h-8 text-blue-600" />
                            <span className="ml-2 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                                SprintBI
                            </span>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            <NavLink
                                to="/dashboard"
                                className={({ isActive }) =>
                                    `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive
                                        ? 'border-blue-500 text-zinc-900 dark:text-white'
                                        : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                                    }`
                                }
                            >
                                <LayoutDashboard className="w-4 h-4 mr-2" />
                                Dashboard
                            </NavLink>
                            <NavLink
                                to="/submit"
                                className={({ isActive }) =>
                                    `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive
                                        ? 'border-blue-500 text-zinc-900 dark:text-white'
                                        : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                                    }`
                                }
                            >
                                <PlusCircle className="w-4 h-4 mr-2" />
                                Submit Report
                            </NavLink>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};
